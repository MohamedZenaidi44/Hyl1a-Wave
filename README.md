# Hyl1a Wave

Lecteur de musique perso, dans l'esprit de Spotify. Il lit tes fichiers audio et tes playlists YouTube dans la même file.

## Contenu
- `index.html` : l'interface (3 panneaux + lecteur en bas ; onglets + mini-lecteur sur mobile ; thème clair/sombre automatique ou thèmes personnalisés).
- `app.js` : la logique (lecture, file d'attente, recherche, favoris, historique, playlists perso, YouTube, sauvegarde).
- `scripts/fetch-youtube.mjs` : récupère une playlist YouTube via l'API officielle et écrit `data/youtube.json`.
- `scripts/sync-innertube.mjs` : même chose sans clé API (playlists publiques ou non répertoriées).
- `data/` : les fichiers que lit le site (`youtube.json`, plus tard `local.json`). Sans données, une petite démo s'affiche.
- `manifest.json`, `sw.js`, `icons/` : installation PWA et cache de l'interface pour le mode hors-ligne.

## Ajouter ou mettre à jour une playlist YouTube
1. Crée une clé gratuite : Google Cloud Console → nouveau projet → activer **YouTube Data API v3** → Identifiants → Clé API. Ne la mets jamais dans le dépôt.
2. Dans ce dossier (Node 18+) :
   ```
   YT_API_KEY=ta_clé node scripts/fetch-youtube.mjs <id ou URL de playlist>
   ```
   Sous Windows PowerShell : `$env:YT_API_KEY="ta_clé"; node scripts/fetch-youtube.mjs <id>`
3. Le script **ajoute** la playlist à `data/youtube.json` sans toucher aux autres, retire les doublons, ignore les vidéos non intégrables et note l'identifiant (`pid`) pour pouvoir la mettre à jour.
4. `node scripts/fetch-youtube.mjs` sans argument re-synchronise toutes les playlists qui ont un `pid`. Relancer la même commande ne crée jamais de doublon.
5. Un identifiant de playlist peut être court (ex. `PLIchPb3nek8M`) ou long : copie tout ce qui suit `list=` dans l'URL. Le script avertit seulement s'il paraît invalide.

### Sans clé API (plus simple)

```
node scripts/sync-innertube.mjs <URL complète de la playlist> [...]
```

Même comportement (ajout, mise à jour, doublons, `pid`), mais passe par l'API interne du site YouTube : la playlist doit être **publique ou non répertoriée** (pas privée). Sans argument, le script re-synchronise les playlists dont le `pid` est complet. Si YouTube change son interface, la méthode avec clé API ci-dessus reste la solution de secours.

Sans clé en local : onglet **Actions → Synchroniser YouTube → Run workflow** (secret de dépôt `YT_API_KEY` requis). Le résultat est commité et Vercel redéploie.

## Fonctionnalités
- Lecture / pause / précédent (redémarre le titre après 3 s) / suivant, progression, volume, sourdine.
- Aléatoire réel (le « précédent » revient au titre joué), répétition liste / titre.
- **File d'attente** : « Lire ensuite », « Ajouter à la file », retirer, réorganiser (▲▼ ou glisser-déposer).
- **Favoris** (cœur partout) avec rubrique dédiée, **historique**, **playlists personnalisées** (menu « ⋯ »).
- **En cours de lecture** plein écran (clic sur la pochette de la barre ou touche `F`), mini-lecteur fixe, navigation en bas sur mobile.
- Minuteur de sommeil (15/30/45/60 min ou fin du titre).
- **Thèmes personnalisés** inspirés de spicetify.app (bouton palette en haut, ou touche `T`) : Spotify, Dribbblish, Catppuccin, Dracula, Nord, Gruvbox, Tokyo Night, Rosé Pine, Bloom, One Punch, Comfy, Ziro, versions claires, plus un accent de couleur personnalisable.
- **Annuler** après suppression d'un titre (file, playlist) ou vidage (file, historique) : le message propose « Annuler » pendant 6 s.
- **Recherche** : bouton ✕, recherches récentes, `Ctrl + K`.
- **Sauvegarde** : export/import JSON des favoris, historique, playlists et réglages (bouton engrenage en haut).
- **Installable (PWA)** : interface mise en cache pour démarrer hors-ligne, lecture audio/YouTube toujours en ligne.
- Reprise après actualisation : titre, position, file, volume, aléatoire, répétition.

Raccourcis (touche `?` pour les afficher) : Espace/K lecture, N/P suivant/précédent, ← → ±5 s, ↑ ↓ volume, M sourdine, S aléatoire, R répéter, L favori, Q file, F plein écran, T thèmes, / ou Ctrl + K recherche.

Données locales (navigateur) : `hw-liked`, `hw-hist`, `hw-playlists`, `hw-prefs`, `hw-state`, `hw-theme`, `hw-acc`, `hw-searches` (le bouton engrenage permet de les exporter/importer).

## Lancer le site
Il faut un petit serveur (le site lit des fichiers JSON, donc pas de double-clic sur `index.html`) :
```
npx serve .
```
ou déploie le dossier tel quel sur Cloudflare Pages.

## Installer le site (PWA)
Sur HTTPS (ou `localhost`), le navigateur propose d'**installer** Hyl1a Wave (icône dans la barre d'adresse, ou menu → « Installer l'application »). L'interface est mise en cache pour s'ouvrir hors-ligne ; la musique (fichiers et YouTube) reste en ligne. Après une mise à jour, recharge une fois pour rafraîchir le cache.

## Limites de YouTube
- Le mini-lecteur YouTube s'affiche en bas à droite quand un titre YouTube joue : il doit rester visible.
- Les vidéos qui interdisent l'intégration sont ignorées par le script.
- Des pubs peuvent passer, et la lecture s'arrête souvent quand l'écran du téléphone se verrouille.
- La lecture YouTube réelle n'a été testée qu'avec un faux lecteur : vérifie-la chez toi (surtout sur iPhone).

## À faire
- [ ] Script pour tes fichiers perso (MP3/FLAC…) : lecture des tags, durée, cover, génération de `data/local.json`, envoi sur Cloudflare R2.
- [ ] Vraies pochettes pour les fichiers perso.
- [ ] Onglet Vidéos, si tu le veux toujours.
