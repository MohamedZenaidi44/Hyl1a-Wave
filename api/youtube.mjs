/* Fonction Vercel : GET /api/youtube?list=PID1,PID2
   Relit des playlists YouTube publiques ou non répertoriées (sans clé API)
   et renvoie { playlists: [{name, pid, tracks}], tracks: [...], failed: [pid] }. */
const KEY = process.env.YT_WEB_KEY || "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"; // clé publique du site web YouTube
const API = "https://www.youtube.com/youtubei/v1/browse";
const CLIENT = { clientName: "WEB", clientVersion: "2.20260101.00.00", hl: "fr", gl: "FR" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const looksValid = id => /^[\w-]{10,60}$/.test(id);

/* ---------- API interne YouTube (InnerTube) ---------- */
async function browse(payload) {
  const r = await fetch(`${API}?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" },
    body: JSON.stringify({ context: { client: CLIENT }, ...payload }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || `erreur ${j.error.code}`);
  return j;
}

function collect(obj, key, out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (obj[key] !== undefined) out.push(obj[key]);
  for (const v of Object.values(obj)) collect(v, key, out);
  return out;
}

function nextToken(j) {
  for (const it of collect(j, "continuationItemViewModel")) {
    const t = it?.continuationCommand?.innertubeCommand?.continuationCommand?.token;
    if (t) return t;
  }
  for (const it of collect(j, "continuationItemRenderer")) {   // ancien format
    const t = it?.continuationEndpoint?.continuationCommand?.token;
    if (t) return t;
  }
  return null;
}

// (normName inutile côté serveur)
const _normName = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseDuration(text) {
  if (!/^\d{1,2}(?::\d{1,2}){1,2}$/.test(text || "")) return 0;
  return text.split(":").reduce((s, x) => s * 60 + (+x || 0), 0);
}

function readVideos(j) {
  const videos = [];
  for (const lv of collect(j, "lockupViewModel")) {
    if (lv.contentType && lv.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") continue;
    const vid = lv.contentId;
    const title = lv.metadata?.lockupMetadataViewModel?.title?.content;
    if (!vid || !title) continue;

    let channel = "";
    const rows = lv.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
    outer: for (const row of rows) {
      for (const part of row.metadataParts || []) {
        if (part.text?.content) { channel = part.text.content; break outer; }
      }
    }

    let d = 0;
    for (const badge of collect(lv.contentImage, "thumbnailBadgeViewModel")) {
      d = parseDuration(badge?.text);
      if (d) break;
    }

    videos.push({ vid, title, channel, d });
  }
  for (const pv of collect(j, "playlistVideoRenderer")) {      // ancien format
    const vid = pv.videoId;
    const title = pv.title?.runs?.map(r => r.text).join("") || pv.title?.simpleText || "";
    if (!vid || !title) continue;
    const channel = pv.shortBylineText?.runs?.[0]?.text || pv.longBylineText?.runs?.[0]?.text || "";
    const d = +pv.lengthSeconds || parseDuration(pv.lengthText?.simpleText);
    videos.push({ vid, title, channel, d });
  }
  return videos;
}

/* "Artiste - Titre (Official Video)" → { a: "Artiste", t: "Titre" } */
const NOISE = /\s*[\(\[]\s*(official|lyrics?|lyric video|audio|video|clip|hd|hq|4k|visuali[sz]er|music video|clip officiel)[^\)\]]*[\)\]]/gi;
function clean(title, channel) {
  let t = title.replace(NOISE, "").replace(/\s+/g, " ").trim();
  let a = channel.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  const m = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) { a = m[1].trim(); t = m[2].trim(); }
  return { a, t };
}

async function fetchPlaylist(pid) {
  const first = await browse({ browseId: "VL" + pid });
  const name = first.header?.pageHeaderRenderer?.pageTitle
    || collect(first, "playlistHeaderRenderer")
      .map(x => x?.title?.simpleText || x?.title?.runs?.map(r => r.text).join(""))
      .find(Boolean)
    || "";
  if (!name) throw new Error("playlist introuvable, privée ou réponse YouTube inattendue");

  const videos = readVideos(first);
  let token = nextToken(first);
  let pages = 1;
  while (token && pages < 100) {
    const page = await browse({ continuation: token });
    videos.push(...readVideos(page));
    token = nextToken(page);
    pages++;
  }

  const uniq = [];
  const seen = new Set();
  for (const v of videos) {
    if (seen.has(v.vid)) continue;
    seen.add(v.vid);
    uniq.push(v);
  }
  return { name, videos: uniq };
}


export default async function handler(req, res) {
  const ids = [...new Set(String(req.query.list || "").split(",").map(s => s.trim()).filter(looksValid))].slice(0, 10);
  if (!ids.length) return res.status(400).json({ error: "paramètre list manquant ou invalide" });

  const out = { playlists: [], tracks: [], failed: [] };
  const seen = new Set();

  const results = await Promise.allSettled(ids.map(fetchPlaylist));
  results.forEach((r, i) => {
    const pid = ids[i];
    if (r.status !== "fulfilled" || !r.value.videos.length) { out.failed.push(pid); return; }
    const { name, videos } = r.value;
    out.playlists.push({ name, pid, tracks: videos.map(v => "yt:" + v.vid) });
    for (const v of videos) {
      const id = "yt:" + v.vid;
      if (seen.has(id)) continue;
      seen.add(id);
      const { a, t } = clean(v.title, v.channel);
      out.tracks.push({ id, yt: v.vid, t, a, al: name, d: v.d });
    }
  });

  if (!out.playlists.length) return res.status(502).json(out);
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(out);
}
