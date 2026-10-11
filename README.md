# Hyl1a Wave

Lecteur de musique perso, dans l'esprit de Spotify. Il lit tes fichiers audio et tes playlists YouTube dans la même file.

## Contenu
- `index.html` : l'interface (3 panneaux + lecteur en bas ; onglets + mini-lecteur sur mobile ; thème clair/sombre automatique).
- `app.js` : la logique (lecture, file d'attente, recherche, favoris, historique, playlists perso, YouTube).
- `scripts/fetch-youtube.mjs` : récupère une playlist YouTube et écrit `data/youtube.json`.
- `data/` : les fichiers que lit le site (`youtube.json`, plus tard `local.json`). Sans données, une petite démo s'affiche.

## Ajouter ou mettre à jour une playlist YouTube
1. Crée une clé gratuite : Google Cloud Console → nouveau projet → activer **YouTube Data API v3** → Identifiants → Clé API. Ne la mets jamais dans le dépôt.
2. Dans ce dossier (Node 18+) :
   ```
   YT_API_KEY=ta_clé node scripts/fetch-youtube.mjs <id ou URL de playlist>
   ```
   Sous Windows PowerShell : `$env:YT_API_KEY="ta_clé"; node scripts/fetch-youtube.mjs <id>`
3. Le script **ajoute** la playlist à `data/youtube.json` sans toucher aux autres, retire les doublons, ignore les vidéos non intégrables et note l'identifiant (`pid`) pour pouvoir la mettre à jour.
4. `node scripts/fetch-youtube.mjs` sans argument re-synchronise toutes les playlists qui ont un `pid`. Relancer la même commande ne crée jamais de doublon.
5. Un identifiant de playlist complet fait 18, 24 ou 34 caractères (ex. `PLxxxxxxxxxxxxxxxx`) ; le script avertit s'il paraît tronqué. Copie tout ce qui suit `list=` dans l'URL.

Sans clé en local : onglet **Actions → Synchroniser YouTube → Run workflow** (secret de dépôt `YT_API_KEY` requis). Le résultat est commité et Vercel redéploie.

## Fonctionnalités
- Lecture / pause / précédent (redémarre le titre après 3 s) / suivant, progression, volume, sourdine.
- Aléatoire réel (le « précédent » revient au titre joué), répétition liste / titre.
- **File d'attente** : « Lire ensuite », « Ajouter à la file », retirer, réorganiser (▲▼ ou glisser-déposer).
- **Favoris** (cœur partout) avec rubrique dédiée, **historique**, **playlists personnalisées** (menu « ⋯ »).
- **En cours de lecture** plein écran (clic sur la pochette de la barre ou touche `F`), mini-lecteur fixe, navigation en bas sur mobile.
- Minuteur de sommeil (15/30/45/60 min ou fin du titre).
- Reprise après actualisation : titre, position, file, volume, aléatoire, répétition.

Raccourcis (touche `?` pour les afficher) : Espace/K lecture, N/P suivant/précédent, ← → ±5 s, ↑ ↓ volume, M sourdine, S aléatoire, R répéter, L favori, Q file, F plein écran, / recherche.

Données locales (navigateur) : `hw-liked`, `hw-hist`, `hw-playlists`, `hw-prefs`, `hw-state`.

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
- La lecture YouTube réelle n'a été testée qu'avec un faux lecteur : vérifie-la chez toi (surtout sur iPhone).

## À faire
- [ ] Script pour tes fichiers perso (MP3/FLAC…) : lecture des tags, durée, cover, génération de `data/local.json`, envoi sur Cloudflare R2.
- [ ] Vraies pochettes pour les fichiers perso.
- [ ] Onglet Vidéos, si tu le veux toujours.
