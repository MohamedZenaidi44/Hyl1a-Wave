# Hyl1a Wave

Lecteur de musique perso, dans l'esprit de Spotify. Il lit tes fichiers audio et tes playlists YouTube dans la même file.

## Contenu
- `index.html` : l'interface (3 panneaux + lecteur en bas, thème clair/sombre automatique).
- `app.js` : la logique (lecture, file d'attente, recherche, favoris, YouTube).
- `scripts/fetch-youtube.mjs` : récupère une playlist YouTube et écrit `data/youtube.json`.
- `data/` : les fichiers que lit le site (`youtube.json`, plus tard `local.json`). Sans données, une petite démo s'affiche.

## Ajouter ta playlist YouTube
1. Crée une clé gratuite : Google Cloud Console → nouveau projet → activer **YouTube Data API v3** → Identifiants → Clé API.
2. Dans ce dossier, lance (Node 18+) :
   ```
   YT_API_KEY=ta_clé node scripts/fetch-youtube.mjs PLIchPb3nek8M
   ```
   Sous Windows PowerShell : `$env:YT_API_KEY="ta_clé"; node scripts/fetch-youtube.mjs PLIchPb3nek8M`
3. Le script lit tous les titres, nettoie « Artiste - Titre (Official Video) » en Artiste + Titre, récupère la durée et écrit `data/youtube.json`. La miniature est déduite de l'identifiant de la vidéo.
4. Relance le script quand tu modifies ta playlist. Tu peux passer plusieurs identifiants ou URL de playlists.

## Lancer le site
Il faut un petit serveur (le site lit des fichiers JSON, donc pas de double-clic sur `index.html`) :
```
npx serve .
```
ou déploie le dossier tel quel sur Cloudflare Pages.

## Limites de YouTube
- Le mini-lecteur YouTube s'affiche en bas à droite quand un titre YouTube joue : il doit rester visible.
- Les vidéos qui interdisent l'intégration sont ignorées par le script.
- Des pubs peuvent passer, et la lecture s'arrête souvent quand l'écran du téléphone se verrouille.
- Je n'ai pas pu tester la lecture YouTube réelle depuis mon environnement : vérifie-la chez toi et dis-moi ce qui coince.

## À faire
- [ ] Script pour tes fichiers perso (MP3/FLAC…) : lecture des tags, durée, cover, génération de `data/local.json`, envoi sur Cloudflare R2.
- [ ] Vraies pochettes pour les fichiers perso.
- [ ] Onglet Vidéos, si tu le veux toujours.
