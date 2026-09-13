# Hyl1a Stream — Worker Cloudflare (catalogue maison + audio auto-hébergé)

## Pourquoi pas Spotify ?

On avait au départ un Worker qui lisait une playlist Spotify via le
flux "Client Credentials" (sans connexion utilisateur). Depuis la
migration Spotify de février 2026, ce flux ne peut plus lire le
contenu d'une playlist — même publique : Spotify ne renvoie les
pistes que pour les playlists appartenant à l'utilisateur authentifié,
ce qu'un flux "app-only" ne peut jamais satisfaire (il n'y a pas
d'utilisateur du tout). Résultat : 403 Forbidden, systématiquement.

On garde donc les choses simples et stables : **tu maintiens toi-même
un petit fichier `catalog.json`** avec les infos de tes morceaux
(titre, artiste, durée, pochette), et le Worker le sert tel quel. Plus
aucune dépendance à l'API Spotify, plus aucun risque que ça recasse au
prochain changement de politique.

## 1. Déployer le Worker

```bash
cd worker
npm install -g wrangler   # si pas déjà fait
wrangler login

# Crée le bucket R2 pour héberger les mp3 (si pas déjà fait)
wrangler r2 bucket create hyl1a-stream-audio

# Édite wrangler.toml : ALLOWED_ORIGIN (l'URL de ton site, pour le CORS)

wrangler deploy
```

Tu obtiens une URL du style `https://hyl1a-stream-api.TON-COMPTE.workers.dev`.

## 2. Remplir ton catalogue

Copie `catalog.example.json` en `catalog.json`, et remplis-le avec tes
morceaux :

```json
[
  {
    "title": "Nuit Étoilée",
    "artist": "Aïsha K.",
    "duration": "3:47",
    "cover": "https://...jpg",
    "file": "nuit-etoilee.mp3"
  }
]
```

- `duration` : au format `mm:ss`. Tu peux aussi mettre `"durationMs": 227000`
  à la place si tu préfères, le Worker calculera le format `mm:ss` lui-même.
- `cover` : une URL d'image (optionnel — si tu ne mets rien, une icône
  par défaut sera utilisée).
- `file` : le nom exact du fichier mp3 tel qu'il est dans ton bucket R2.

Uploade-le dans le bucket R2 :

```bash
wrangler r2 object put hyl1a-stream-audio/catalog.json --file ./catalog.json
```

**Pour mettre à jour ta bibliothèque plus tard**, il te suffit de
modifier `catalog.json` et de refaire cette commande — pas besoin de
redéployer le Worker.

## 3. Uploader les fichiers audio

Chaque morceau doit être uploadé dans le bucket sous le nom exact
indiqué dans le champ `file` de `catalog.json` :

```bash
wrangler r2 object put hyl1a-stream-audio/nuit-etoilee.mp3 \
  --file ./mes-mp3/nuit-etoilee.mp3
```

## 4. Brancher le front

Dans `app.js` (à la racine du projet, pas dans `worker/`), mets à jour :

```js
const CONFIG = {
  API_BASE: "https://hyl1a-stream-api.TON-COMPTE.workers.dev",
};
```

Et redéploie ton site. Au chargement, l'onglet **Musique** va chercher
`/api/playlist`, qui renvoie ton `catalog.json`, et la lecture utilise
`/audio/<file>.mp3` — égaliseur inclus, basé sur le vrai signal audio
(Web Audio API).

## Notes

- Les fichiers audio sont servis avec support du "range" HTTP, donc tu
  peux avancer/reculer dans un morceau sans tout retélécharger.
- Cet usage suppose un espace strictement personnel/privé. Pense à
  garder l'accès au site et au bucket privés si les fichiers audio ne
  t'appartiennent pas.
