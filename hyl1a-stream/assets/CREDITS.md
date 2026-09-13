# Assets

## Icônes — `assets/icons/`
Pack **Crystal Clear** par Everaldo Coelho, licence LGPL (réutilisation et
modification libres). Fichiers renommés depuis le pack original :

| Fichier               | Origine (pack Crystal Clear)      |
|------------------------|------------------------------------|
| search.png             | actions/find.png (32×32)          |
| account.png            | apps/personal.png (32×32)         |
| type-music.png          | apps/lsongs.png (48×48)            |
| type-video.png          | apps/xine.png (48×48)              |
| type-album.png          | apps/kscd.png (48×48)              |
| type-playlist.png       | actions/playlist.png (48×48)       |
| cover-default.png       | apps/kscd.png (64×64)              |
| favorite.png            | actions/bookmark.png (32×32)       |

Si tu changes de pack d'icônes plus tard, remplace ces fichiers en gardant
les mêmes noms (référencés dans `index.html` / `app.js`).

`cover-default.png` est une pochette de secours tant qu'un morceau n'a pas
de vraie image d'album — remplace-la dynamiquement en donnant à l'`<img>`
la classe `is-artwork` pour qu'elle occupe tout le cadre (`object-fit: cover`).

## Fond d'écran — `assets/img/background.jpg`
Image fournie par l'utilisateur (fond orange abstrait). Affichée en
calque fixe derrière toute l'interface (`.bg-layer` dans `styles.css`),
avec un voile sombre dessus pour garder le texte lisible.

## Sons d'interface — `assets/sounds/`
Extraits du pack **Windows 7 Sounds** (thème par défaut), renommés :

| Fichier          | Origine                         | Utilisé pour                    |
|-------------------|----------------------------------|-----------------------------------|
| nav-tab.wav        | Windows Navigation Start.wav     | changement d'onglet (Musique/Vidéos/Playlists) |
| click.wav          | Windows Menu Command.wav         | clic sur un filtre, précédent/suivant, shuffle/repeat |
| favorite.wav       | Windows Notify.wav               | ajout d'un titre aux favoris     |

Ces sons ne se déclenchent qu'au clic (geste utilisateur), pour respecter
les restrictions de lecture automatique des navigateurs.
