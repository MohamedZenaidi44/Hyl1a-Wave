#!/usr/bin/env node
/* Récupère une ou plusieurs playlists YouTube et écrit data/youtube.json
   Usage :  YT_API_KEY=ta_clé node scripts/fetch-youtube.mjs PLIchPb3nek8M [autre_id ...]
   (accepte aussi une URL de playlist complète). Node 18+ requis. */
import { writeFileSync, mkdirSync } from "node:fs";

const KEY = process.env.YT_API_KEY;
const inputs = process.argv.slice(2).map(a => a.match(/[?&]list=([\w-]+)/)?.[1] || a);
if (!KEY || !inputs.length) {
  console.error("Usage : YT_API_KEY=xxx node scripts/fetch-youtube.mjs <id ou url de playlist> [...]");
  process.exit(1);
}

const api = async (path, params) => {
  const url = `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key: KEY })}`;
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

const tracks = new Map();
const playlists = [];

for (const pid of inputs) {
  const pl = (await api("playlists", { part: "snippet", id: pid })).items?.[0];
  if (!pl) { console.warn(`Playlist introuvable ou privée : ${pid}`); continue; }

  const ids = [];
  let pageToken;
  do {
    const page = await api("playlistItems", { part: "contentDetails", playlistId: pid, maxResults: 50, ...(pageToken && { pageToken }) });
    ids.push(...page.items.map(i => i.contentDetails.videoId));
    pageToken = page.nextPageToken;
  } while (pageToken);

  const mine = [];
  for (let i = 0; i < ids.length; i += 50) {
    const res = await api("videos", { part: "snippet,contentDetails,status", id: ids.slice(i, i + 50).join(",") });
    for (const v of res.items) {
      if (v.status?.embeddable === false) { console.warn(`Non intégrable, ignorée : ${v.snippet.title}`); continue; }
      const { a, t } = clean(v.snippet.title, v.snippet.channelTitle);
      const id = "yt:" + v.id;
      tracks.set(id, { id, yt: v.id, t, a, al: pl.snippet.title, d: dur(v.contentDetails.duration) });
      mine.push(id);
    }
  }
  playlists.push({ name: pl.snippet.title, tracks: mine });
  console.log(`✔ ${pl.snippet.title} : ${mine.length} titres`);
}

mkdirSync("data", { recursive: true });
writeFileSync("data/youtube.json", JSON.stringify({ tracks: [...tracks.values()], playlists }, null, 2));
console.log("→ data/youtube.json écrit");
