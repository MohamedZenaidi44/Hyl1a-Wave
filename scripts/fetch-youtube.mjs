#!/usr/bin/env node
/* Synchronise des playlists YouTube dans data/youtube.json
   Usage :
     YT_API_KEY=ta_clé node scripts/fetch-youtube.mjs <id ou url> [autre_id ...]   → ajoute / met à jour ces playlists
     YT_API_KEY=ta_clé node scripts/fetch-youtube.mjs                              → re-synchronise toutes les playlists connues (celles qui ont un "pid")
   Les playlists déjà présentes dans data/youtube.json ne sont jamais supprimées.
   Node 18+ requis. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const KEY = process.env.YT_API_KEY;
const BASE = process.env.YT_API_BASE || "https://www.googleapis.com/youtube/v3"; // surchargeable pour les tests
const OUT = process.env.YT_OUT || "data/youtube.json";

const extractId = a => a.match(/[?&]list=([\w-]+)/)?.[1] || a;
const argIds = process.argv.slice(2).map(extractId);

/* ---------- Données existantes (on les fusionne, on ne les écrase pas) ---------- */
let data = { tracks: [], playlists: [] };
if (existsSync(OUT)) {
  try { data = JSON.parse(readFileSync(OUT, "utf8")); } catch { console.warn(`${OUT} illisible, il sera recréé.`); }
}
data.tracks ||= [];
data.playlists ||= [];

const inputs = argIds.length ? argIds : data.playlists.map(p => p.pid).filter(Boolean);

if (!KEY || !inputs.length) {
  console.error(
    "Usage : YT_API_KEY=xxx node scripts/fetch-youtube.mjs <id ou url de playlist> [...]\n" +
    (KEY && !argIds.length ? "Aucune playlist connue à re-synchroniser : donne au moins un identifiant." : "")
  );
  process.exit(1);
}

/* Un identifiant de playlist valide fait 18, 24 ou 34 caractères (PL + 16/22/32). */
const looksValid = id => /^(PL|UU|LL|FL|RD|OL)[\w-]{16}$|^PL[\w-]{22}$|^PL[\w-]{32}$/.test(id);

const api = async (path, params) => {
  const url = `${BASE}/${path}?${new URLSearchParams({ ...params, key: KEY })}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} : ${j.error?.message || r.status}`);
  return j;
};

const dur = iso => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "") || [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};

// "Artiste - Titre (Official Video)" → { a: "Artiste", t: "Titre" }
const NOISE = /\s*[\(\[]\s*(official|lyrics?|lyric video|audio|video|clip|hd|hq|4k|visuali[sz]er|music video|clip officiel)[^\)\]]*[\)\]]/gi;
function clean(title, channel) {
  let t = title.replace(NOISE, "").replace(/\s+/g, " ").trim();
  let a = channel.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  const m = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) { a = m[1].trim(); t = m[2].trim(); }
  return { a, t };
}

const tracks = new Map(data.tracks.map(t => [t.id, t]));
let failed = 0;
let done = 0;

for (const pid of [...new Set(inputs)]) {
  if (!looksValid(pid)) {
    console.warn(`⚠ « ${pid} » (${pid.length} caractères) ne ressemble pas à un identifiant de playlist complet (18, 24 ou 34 caractères). Copie l'intégralité de la valeur après « list= » dans l'URL.`);
  }

  let pl;
  try { pl = (await api("playlists", { part: "snippet", id: pid })).items?.[0]; }
  catch (e) { console.error(`✘ ${pid} : ${e.message}`); failed++; continue; }
  if (!pl) { console.warn(`✘ Playlist introuvable ou privée : ${pid}`); failed++; continue; }

  const ids = [];
  let pageToken;
  do {
    const page = await api("playlistItems", { part: "contentDetails", playlistId: pid, maxResults: 50, ...(pageToken && { pageToken }) });
    ids.push(...page.items.map(i => i.contentDetails.videoId));
    pageToken = page.nextPageToken;
  } while (pageToken);

  const mine = [];
  const uniq = [...new Set(ids)];
  if (uniq.length < ids.length) console.log(`  ${ids.length - uniq.length} doublon(s) retiré(s) dans « ${pl.snippet.title} »`);

  for (let i = 0; i < uniq.length; i += 50) {
    const res = await api("videos", { part: "snippet,contentDetails,status", id: uniq.slice(i, i + 50).join(",") });
    const byId = new Map(res.items.map(v => [v.id, v]));
    for (const vid of uniq.slice(i, i + 50)) {          // on garde l'ordre de la playlist
      const v = byId.get(vid);
      if (!v) continue;                                   // vidéo supprimée / privée
      if (v.status?.embeddable === false) { console.warn(`Non intégrable, ignorée : ${v.snippet.title}`); continue; }
      const id = "yt:" + v.id;
      if (!tracks.has(id)) {                              // titre déjà connu : on ne le réécrit pas
        const { a, t } = clean(v.snippet.title, v.snippet.channelTitle);
        tracks.set(id, { id, yt: v.id, t, a, al: pl.snippet.title, d: dur(v.contentDetails.duration) });
      }
      mine.push(id);
    }
  }

  const entry = { name: pl.snippet.title, pid, tracks: mine };
  // Même playlist = même pid, ou à défaut même nom (anciennes entrées sans pid) → remplacée, jamais dupliquée
  const at = data.playlists.findIndex(p => p.pid === pid || (!p.pid && p.name === entry.name));
  if (at >= 0) data.playlists[at] = entry; else data.playlists.push(entry);
  console.log(`✔ ${entry.name} : ${mine.length} titres`);
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
