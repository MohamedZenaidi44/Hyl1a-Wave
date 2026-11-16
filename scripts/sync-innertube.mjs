#!/usr/bin/env node
/* Synchronise des playlists YouTube dans data/youtube.json, sans clé API.
   Utilise l'API interne du site YouTube : playlists publiques ou non répertoriées.
   Usage :
     node scripts/sync-innertube.mjs <url ou id> [...]   → ajoute / met à jour ces playlists
     node scripts/sync-innertube.mjs                     → re-synchronise toutes les playlists connues (pid complet)
   Les playlists déjà présentes dans data/youtube.json ne sont jamais supprimées.
   Node 18+ requis. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const OUT = process.env.YT_OUT || "data/youtube.json";
const KEY = process.env.YT_WEB_KEY || "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"; // clé publique du site web YouTube
const API = process.env.YT_API_BASE || "https://www.youtube.com/youtubei/v1/browse";
const CLIENT = { clientName: "WEB", clientVersion: "2.20260101.00.00", hl: "fr", gl: "FR" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const extractId = a => a.match(/[?&]list=([\w-]+)/)?.[1] || a;
const argIds = process.argv.slice(2).map(extractId);

/* ---------- Données existantes (on les fusionne, on ne les écrase pas) ---------- */
let data = { tracks: [], playlists: [] };
if (existsSync(OUT)) {
  try { data = JSON.parse(readFileSync(OUT, "utf8")); } catch { console.warn(`${OUT} illisible, il sera recréé.`); }
}
data.tracks ||= [];
data.playlists ||= [];

/* Un identifiant de playlist peut être court (ex. PLIchPb3nek8M) ou long (PL + 16/22/32). */
const looksValid = id => /^[\w-]{10,60}$/.test(id);

const stale = data.playlists.filter(p => !p.pid || !looksValid(p.pid));
const inputs = argIds.length ? argIds : data.playlists.map(p => p.pid).filter(p => p && looksValid(p.pid));

if (!argIds.length && stale.length) {
  for (const p of stale) {
    console.warn(`⚠ « ${p.name} » n'a pas d'identifiant de playlist exploitable. Donne son URL complète une fois pour la corriger ; elle sera re-synchronisée sans argument ensuite.`);
  }
}

if (!inputs.length) {
  console.error(
    "Usage : node scripts/sync-innertube.mjs <id ou url de playlist> [...]\n" +
    (stale.length ? "Aucune playlist connue à re-synchroniser : donne au moins une URL complète." : "")
  );
  process.exit(1);
}

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

const normName = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

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

const tracks = new Map(data.tracks.map(t => [t.id, t]));
let failed = 0;
let done = 0;

for (const pid of [...new Set(inputs)]) {
  if (!looksValid(pid)) {
    console.warn(`⚠ « ${pid} » (${pid.length} caractères) ne ressemble pas à un identifiant de playlist. Copie l'intégralité de la valeur après « list= » dans l'URL.`);
  }

  let pl;
  try { pl = await fetchPlaylist(pid); }
  catch (e) { console.error(`✘ ${pid} : ${e.message}`); failed++; continue; }
  if (!pl.videos.length) { console.warn(`✘ Playlist vide, introuvable ou privée : ${pid}`); failed++; continue; }

  const entry = { name: pl.name, pid, tracks: pl.videos.map(v => "yt:" + v.vid) };
  const at = data.playlists.findIndex(p => p.pid === pid || ((!p.pid || !looksValid(p.pid)) && normName(p.name) === normName(entry.name)));
  const before = new Set(at >= 0 ? data.playlists[at].tracks || [] : []);
  const fixed = at >= 0 && data.playlists[at].pid !== pid;

  let added = 0;
  for (const v of pl.videos) {
    const id = "yt:" + v.vid;
    if (!tracks.has(id)) {
      const { a, t } = clean(v.title, v.channel);
      tracks.set(id, { id, yt: v.vid, t, a, al: entry.name, d: v.d });
    }
    if (!before.has(id)) added++;
  }

  if (at >= 0) data.playlists[at] = entry; else data.playlists.push(entry);
  console.log(`✔ ${entry.name} : ${entry.tracks.length} titres${added ? ` (${added} nouveau${added > 1 ? "x" : ""})` : ""}${fixed ? " — identifiant corrigé" : ""}`);
  done++;
}

if (!done) {
  console.error("Aucune playlist synchronisée : data/youtube.json n'a pas été modifié.");
  process.exit(2);
}

/* On ne garde que les titres encore référencés par une playlist */
const used = new Set(data.playlists.flatMap(p => p.tracks));
data.tracks = [...tracks.values()].filter(t => used.has(t.id));

mkdirSync("data", { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(`→ ${OUT} écrit (${data.tracks.length} titres, ${data.playlists.length} playlists)`);
if (failed) process.exitCode = 2;
