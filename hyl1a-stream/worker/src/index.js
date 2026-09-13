/* ============================================================
   HYL1A STREAM — Worker Cloudflare
   - /api/playlist -> métadonnées de ta bibliothèque, lues depuis
                      un catalogue JSON que tu maintiens toi-même
                      (catalog.json), stocké dans le même bucket R2
                      que tes mp3.
   - /audio/:file  -> fichier audio servi depuis R2 (support du
                      "range" HTTP pour permettre le seek).

   Pourquoi un catalogue maison et pas l'API Spotify ?
   Depuis la migration Spotify de février 2026, le flux Client
   Credentials (sans connexion utilisateur) ne peut plus lire le
   contenu d'une playlist, même publique : Spotify ne renvoie les
   pistes que pour les playlists appartenant à l'utilisateur
   authentifié — ce qu'un flux "app-only" ne peut jamais satisfaire.
   Un catalogue JSON maintenu à la main est donc plus simple, et
   surtout il ne dépend plus des changements de politique de Spotify.

   Variables (wrangler.toml [vars]) :
     ALLOWED_ORIGIN -> l'URL de ton front (pour le CORS)

   Binding R2 (wrangler.toml [[r2_buckets]]) :
     AUDIO_BUCKET -> bucket contenant tes mp3 ET ton catalog.json

   Format de catalog.json (tableau d'objets) :
     [
       {
         "title": "Nuit Étoilée",
         "artist": "Aïsha K.",
         "duration": "3:47",       // ou "durationMs": 227000
         "cover": "https://...jpg", // optionnel, une URL d'image
         "file": "nuit-etoilee.mp3" // nom exact du fichier dans R2
       },
       ...
     ]

   Pour publier/mettre à jour le catalogue (pas besoin de redeployer
   le Worker, juste de re-uploader le fichier) :
     wrangler r2 object put hyl1a-stream-audio/catalog.json --file ./catalog.json
   ============================================================ */

const PLAYLIST_CACHE_SECONDS = 60 * 5; // 5 min

function msToTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function corsHeaders(env, extra = {}) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    ...extra,
  };
}

async function handlePlaylist(env) {
  if (!env.AUDIO_BUCKET) {
    return Response.json(
      { error: "Bucket R2 non configuré (binding AUDIO_BUCKET manquant)." },
      { status: 500, headers: corsHeaders(env) }
    );
  }

  const object = await env.AUDIO_BUCKET.get("catalog.json");
  if (!object) {
    return Response.json(
      {
        error:
          "catalog.json introuvable dans le bucket R2. Uploade-le avec : " +
          "wrangler r2 object put hyl1a-stream-audio/catalog.json --file ./catalog.json",
      },
      { status: 404, headers: corsHeaders(env) }
    );
  }

  let raw;
  try {
    raw = JSON.parse(await object.text());
  } catch (err) {
    return Response.json(
      { error: `catalog.json invalide (JSON mal formé) : ${err.message}` },
      { status: 500, headers: corsHeaders(env) }
    );
  }

  if (!Array.isArray(raw)) {
    return Response.json(
      { error: "catalog.json doit être un tableau de morceaux, ex: [ {...}, {...} ]." },
      { status: 500, headers: corsHeaders(env) }
    );
  }

  const tracks = raw
    .filter((t) => t && t.file) // un morceau sans fichier audio n'est pas exploitable
    .map((t) => ({
      title: t.title || "Sans titre",
      sub: t.artist || t.sub || "",
      duration: t.duration || msToTime(t.durationMs) || "",
      durationMs: t.durationMs ?? null,
      cover: t.cover || null,
      audioUrl: `/audio/${encodeURIComponent(t.file)}`,
    }));

  return Response.json(tracks, {
    headers: corsHeaders(env, {
      "Cache-Control": `public, max-age=${PLAYLIST_CACHE_SECONDS}`,
    }),
  });
}

async function handleAudio(request, env, key) {
  if (!env.AUDIO_BUCKET) {
    return new Response("Bucket R2 non configuré", { status: 500 });
  }

  const rangeHeader = request.headers.get("range");
  const object = await env.AUDIO_BUCKET.get(key, {
    range: request.headers, // R2 comprend directement l'en-tête Range
  });

  if (!object) {
    return new Response("Fichier introuvable — vérifie qu'il est bien dans R2 sous ce nom.", {
      status: 404,
      headers: corsHeaders(env),
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  for (const [k, v] of Object.entries(corsHeaders(env))) headers.set(k, v);

  // Réponse partielle (206) si le lecteur a demandé un "range" (seek)
  if (rangeHeader && object.range) {
    const range = object.range;
    const start = range.offset ?? 0;
    const end =
      "end" in range ? range.end :
      "length" in range ? start + range.length - 1 :
      object.size - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (url.pathname === "/api/playlist") {
      return handlePlaylist(env);
    }

    if (url.pathname.startsWith("/audio/")) {
      const key = decodeURIComponent(url.pathname.replace("/audio/", ""));
      return handleAudio(request, env, key);
    }

    return new Response("Not found", { status: 404 });
  },
};
