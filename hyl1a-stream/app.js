/* ============================================================
   HYL1A STREAM — app.js
   Musique : chargée depuis ton Worker Cloudflare (métadonnées
   Spotify + fichiers audio R2). Vidéos/Playlists : données de
   démo en attendant leur propre branchement.
   ============================================================ */

// ---- Config ----
// Mets ici l'URL de ton Worker (voir worker/README.md).
// Tant que ce n'est pas configuré, le site tourne avec des données
// de démo pour que tu puisses continuer à travailler dessus.
const CONFIG = {
  API_BASE: "https://hyl1a-stream-api.mohzn44.workers.dev",
};

// ---- Données de démo (fallback si l'API n'est pas configurée / hors ligne) ----
const DEMO_MUSIC = [
  { type: "music", title: "Nuit Étoilée", sub: "Aïsha K.", duration: "3:47", recent: true, favorite: true },
  { type: "music", title: "Horizon Bleu", sub: "Karim D.", duration: "4:02", recent: true, favorite: false },
  { type: "music", title: "Marée Haute", sub: "Léa Or.", duration: "2:58", recent: false, favorite: true },
  { type: "music", title: "Cristal", sub: "Nova Wave", duration: "3:21", recent: false, favorite: false },
  { type: "music", title: "Dune Dorée", sub: "Aïsha K.", duration: "3:59", recent: true, favorite: false },
];

const DEMO_VIDEOS = [
  { type: "video", title: "Trip Marrakech 2024", sub: "12:04", recent: true, favorite: false },
  { type: "video", title: "Coucher de soleil — Essaouira", sub: "4:37", recent: false, favorite: true },
  { type: "video", title: "Anniversaire — montage", sub: "8:15", recent: false, favorite: false },
];

const PLAYLISTS = [
  { type: "playlist", title: "Route de nuit", sub: "24 titres" },
  { type: "playlist", title: "Focus", sub: "16 titres" },
  { type: "playlist", title: "Souvenirs de voyage", sub: "9 vidéos" },
];

// ---- Icônes de type (pack Crystal Clear — voir assets/CREDITS.md) ----
const ICONS = {
  music: `<img src="assets/icons/type-music.png" alt="" />`,
  video: `<img src="assets/icons/type-video.png" alt="" />`,
  album: `<img src="assets/icons/type-album.png" alt="" />`,
  playlist: `<img src="assets/icons/type-playlist.png" alt="" />`,
};

// ---- Sons d'interface (pack Windows 7 — voir assets/CREDITS.md) ----
const SOUNDS = {
  nav: new Audio("assets/sounds/nav-tab.wav"),
  click: new Audio("assets/sounds/click.wav"),
  favorite: new Audio("assets/sounds/favorite.wav"),
};
Object.values(SOUNDS).forEach((a) => { a.volume = 0.5; a.preload = "auto"; });

function playSound(name) {
  const base = SOUNDS[name];
  if (!base) return;
  const sfx = base.cloneNode();
  sfx.volume = base.volume;
  sfx.play().catch(() => { /* lecture bloquée avant interaction — sans conséquence */ });
}

const TYPE_LABEL = { music: "Musique", video: "Vidéo", album: "Album", playlist: "Playlist" };

const grid = document.getElementById("media-grid");
const sectionTitle = document.getElementById("section-title");
const sectionSubtitle = document.getElementById("section-subtitle");

// ---- Carrousel en arc : structure DOM (boutons de navigation autour de la grille) ----
const arcShell = document.createElement("div");
arcShell.className = "arc-shell";
arcShell.tabIndex = 0;
grid.parentNode.insertBefore(arcShell, grid);
arcShell.appendChild(grid);

const arcPrev = document.createElement("button");
arcPrev.type = "button";
arcPrev.className = "arc-nav-btn arc-prev";
arcPrev.setAttribute("aria-label", "Élément précédent");
arcPrev.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;

const arcNext = document.createElement("button");
arcNext.type = "button";
arcNext.className = "arc-nav-btn arc-next";
arcNext.setAttribute("aria-label", "Élément suivant");
arcNext.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;

arcShell.insertBefore(arcPrev, grid);
arcShell.appendChild(arcNext);

let arcCenterIndex = 0;

function shiftArc(delta) {
  const total = grid.children.length;
  if (!total) return;
  // Modulo "sûr" (gère aussi les deltas négatifs) : permet un bouclage
  // infini au lieu de bloquer aux extrémités de la liste.
  arcCenterIndex = ((arcCenterIndex + delta) % total + total) % total;
  playSound("click");
  layoutArc();
}

// Positionne chaque carte le long d'un arc, la carte centrale étant la
// plus grande et la plus nette ; les autres s'éloignent et se courbent
// de part et d'autre, comme un carrousel façon Windows Media Center.
function layoutArc() {
  const cards = grid.querySelectorAll(".media-card");
  const total = cards.length;
  if (!total) return;

  const shellWidth = arcShell.clientWidth || 900;
  const cardWidth = cards[0].offsetWidth || 240;

  // --- Écartement horizontal : linéaire, avec un plancher garanti ---
  // Avant, x venait de Math.sin(angle) * radius : le sinus s'aplatit très
  // vite, donc augmenter radius/angleStep ne faisait presque plus grandir
  // l'écart réel entre cartes voisines. Ici l'écart est calculé
  // directement en pixels, avec un minimum absolu (cardWidth + desiredGap)
  // qui garantit un espace visible même sur petit écran, et qui grandit
  // sur grand écran jusqu'à ~1.85x la largeur d'une carte.
  const desiredGap = 80; // px d'espace garanti entre le bord de deux cartes voisines
  const minSpacing = cardWidth + desiredGap;
  const spacing = Math.max(minSpacing, Math.min(shellWidth * 0.32, cardWidth * 1.85));

  // --- Courbure : purement angulaire, ne sert plus qu'à la profondeur (y),
  // à l'échelle et à une légère rotation "en éventail" ---
  const angleStep = Math.min(28, 200 / total);
  const curveDepth = Math.max(70, Math.min(170, shellWidth * 0.13));

  cards.forEach((card, i) => {
    let offset = i - arcCenterIndex;
    // Chemin le plus court en cas de bouclage : sans ça, revenir du
    // dernier au premier élément faisait sauter la carte d'un bout à
    // l'autre de l'arc au lieu de glisser en douceur d'un cran.
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const angle = offset * angleStep;
    const rad = (angle * Math.PI) / 180;

    const x = offset * spacing;
    const y = (1 - Math.cos(rad)) * curveDepth;
    const scale = Math.max(0.5, 1 - Math.abs(offset) * 0.14);
    const opacity = Math.max(0, 1 - Math.abs(offset) * 0.22);

    card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotate(${angle * 0.12}deg)`;
    card.style.zIndex = String(200 - Math.abs(offset));
    card.style.opacity = String(opacity);
    card.style.pointerEvents = opacity <= 0.08 ? "none" : "";
    card.classList.toggle("arc-center", offset === 0);
  });

  // Le carrousel boucle à l'infini : les flèches restent toujours actives
  // (elles ne se masquent plus en bout de liste).
}

arcPrev.addEventListener("click", () => shiftArc(-1));
arcNext.addEventListener("click", () => shiftArc(1));

arcShell.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") { e.preventDefault(); shiftArc(-1); }
  if (e.key === "ArrowRight") { e.preventDefault(); shiftArc(1); }
});

let arcWheelLock = false;
arcShell.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (arcWheelLock) return;
  arcWheelLock = true;
  shiftArc(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1);
  setTimeout(() => { arcWheelLock = false; }, 220);
}, { passive: false });

let arcResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(arcResizeTimer);
  arcResizeTimer = setTimeout(layoutArc, 120);
});

// ---- État des données ----
let MUSIC_ITEMS = DEMO_MUSIC;
let musicLoaded = false;
let musicLoadError = null;

function resolveUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return CONFIG.API_BASE ? CONFIG.API_BASE.replace(/\/$/, "") + path : path;
}

// Échappe le HTML pour éviter toute injection via des titres/artistes
// contenant des caractères spéciaux (<, >, &, etc.)
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadSpotifyPlaylist() {
  if (!CONFIG.API_BASE) {
    musicLoadError = "not-configured";
    return;
  }
  try {
    const res = await fetch(`${CONFIG.API_BASE.replace(/\/$/, "")}/api/playlist`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const tracks = await res.json();
    if (!Array.isArray(tracks) || !tracks.length) throw new Error("Playlist vide");

    MUSIC_ITEMS = tracks.map((t, i) => ({
      type: "music",
      title: t.title,
      sub: t.sub,
      duration: t.duration,
      durationMs: t.durationMs,
      cover: t.cover,
      audioUrl: t.audioUrl,
      recent: i < 5,
      favorite: false,
    }));
    musicLoaded = true;
  } catch (err) {
    console.warn("Playlist Spotify indisponible, utilisation des données de démo.", err);
    musicLoadError = err.message;
    MUSIC_ITEMS = DEMO_MUSIC;
  }
}

// ---- Rendu de la grille ----
// Permet de retrouver la carte DOM correspondant à un morceau, pour
// pouvoir la marquer visuellement comme "en cours de lecture".
let cardsByItem = new WeakMap();

function renderGrid(items) {
  grid.innerHTML = "";
  cardsByItem = new WeakMap();

  if (!musicLoaded && currentTab === "music" && !musicLoadError) {
    grid.innerHTML = `<div class="empty-state">Chargement de ta playlist…</div>`;
    return;
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">Rien à afficher ici pour l'instant.</div>`;
    return;
  }

  // Centre l'arc sur le morceau en cours de lecture s'il est visible,
  // sinon sur l'élément du milieu de la sélection.
  let centerIdx = Math.floor((items.length - 1) / 2);
  if (currentTab === "music" && isPlaying) {
    const playingPos = items.indexOf(QUEUE[queueIndex]);
    if (playingPos !== -1) centerIdx = playingPos;
  }
  arcCenterIndex = Math.max(0, Math.min(centerIdx, items.length - 1));

  items.forEach((item, i) => {
    const card = document.createElement("article");
    card.className = "media-card";
    card.dataset.type = item.type;
    card.tabIndex = 0;

    const thumbInner = item.cover
      ? `<img src="${resolveUrl(item.cover)}" alt="" class="is-artwork" loading="lazy" />`
      : (ICONS[item.type] || ICONS.music);

    card.innerHTML = `
      <div class="media-thumb">
        ${thumbInner}
        <div class="media-play">
          <span class="media-play-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#1A1A1A"><path d="M8 5v14l11-7z"/></svg>
          </span>
        </div>
      </div>
      <div class="card-sheen"></div>
      <div class="media-title">${escapeHtml(item.title)}</div>
      <div class="media-sub">
        <span>${escapeHtml(item.sub)}${item.duration ? " · " + escapeHtml(item.duration) : ""}</span>
        <span class="badge-type">${TYPE_LABEL[item.type] || ""}</span>
      </div>
    `;

    const activateCard = () => {
      if (item.type === "music" || item.type === "album") {
        const index = QUEUE.indexOf(item);
        if (index !== -1) playAt(index);
      }
    };

    card.addEventListener("click", () => {
      arcCenterIndex = i;
      layoutArc();
      activateCard();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        arcCenterIndex = i;
        layoutArc();
        activateCard();
      }
    });

    cardsByItem.set(item, card);
    grid.appendChild(card);
  });

  layoutArc();
}

// ---- Onglets haut de page ----
const tabs = document.querySelectorAll(".topbar-tabs .tab");
const filterPills = document.getElementById("filter-pills");

const TAB_CONTENT = {
  music: {
    title: "Ta bibliothèque",
    subtitle: "Tout ce que tu as envoyé sur ton espace Hyl1a, prêt à écouter.",
    items: () => MUSIC_ITEMS,
  },
  videos: {
    title: "Tes vidéos",
    subtitle: "Souvenirs, montages et clips stockés sur ton Cloudflare R2.",
    items: () => DEMO_VIDEOS,
  },
  playlists: {
    title: "Tes playlists",
    subtitle: "Des collections faites pour chaque moment.",
    items: () => PLAYLISTS,
  },
};

let currentTab = "music";
let currentFilter = "all";

function applyFilter(items) {
  if (currentFilter === "recent") return items.filter((i) => i.recent);
  if (currentFilter === "favorites") return items.filter((i) => i.favorite);
  if (currentFilter === "albums") return items.filter((i) => i.type === "album");
  return items;
}

// Force le redémarrage d'une animation CSS déjà jouée sur un élément
// (utilisé pour rejouer l'effet d'entrée à chaque changement d'onglet/filtre)
function replay(el) {
  if (!el) return;
  el.style.animation = "none";
  void el.offsetWidth; // force le reflow
  el.style.animation = "";
}

function renderTab() {
  const conf = TAB_CONTENT[currentTab];
  const contentHeader = document.querySelector(".content-header");
  sectionTitle.textContent = conf.title;
  sectionSubtitle.textContent = conf.subtitle;
  renderGrid(applyFilter(conf.items()));
  updateActiveCard();
  replay(contentHeader);
  replay(grid);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("active")) return;
    playSound("nav");
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    filterPills.style.display = currentTab === "playlists" ? "none" : "flex";
    renderTab();
  });
});

document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    if (pill.classList.contains("active")) return;
    playSound("click");
    document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    currentFilter = pill.dataset.filter;
    renderTab();
  });
});

// ============================================================
// LECTEUR AUDIO — lecture réelle via <audio>, égaliseur via Web Audio API
// ============================================================
const audioEl = document.getElementById("audio-el");
const btnPlay = document.getElementById("btn-play");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");
const btnShuffle = document.getElementById("btn-shuffle");
const btnRepeat = document.getElementById("btn-repeat");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const likeBtn = document.querySelector(".like-btn");

const playerCover = document.getElementById("player-cover");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const progressFill = document.getElementById("progress-fill");
const progressThumb = document.getElementById("progress-thumb");
const progressTrack = document.getElementById("progress-track");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");
const volumeSlider = document.getElementById("volume-slider");

let QUEUE = [];
let queueIndex = 0;
let isPlaying = false;
let isSeeking = false;

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateProgressUI() {
  const duration = audioEl.duration || 0;
  const current = audioEl.currentTime || 0;
  const pct = duration ? (current / duration) * 100 : 0;
  progressFill.style.width = pct + "%";
  progressThumb.style.left = pct + "%";
  timeCurrent.textContent = formatTime(current);
  timeTotal.textContent = formatTime(duration);
}

function setTrack(item) {
  playerTitle.textContent = item.title;
  playerArtist.textContent = item.sub;

  // Rejoue l'animation "liquide" de changement de pochette à chaque morceau
  playerCover.classList.remove("swap");
  void playerCover.offsetWidth; // force le reflow pour pouvoir rejouer l'animation
  playerCover.classList.add("swap");

  if (item.cover) {
    playerCover.innerHTML = `<img src="${resolveUrl(item.cover)}" alt="" class="is-artwork" />`;
  } else {
    playerCover.innerHTML = `<img src="assets/icons/cover-default.png" alt="" width="26" height="26" />`;
  }

  audioEl.src = resolveUrl(item.audioUrl);
  updateProgressUI();
}

// Marque dans la grille la carte du morceau en cours de lecture (glow continu)
function updateActiveCard() {
  document.querySelectorAll(".media-card.is-playing").forEach((c) => c.classList.remove("is-playing"));
  if (!isPlaying) return;
  const track = QUEUE[queueIndex];
  const card = track && cardsByItem.get(track);
  if (card) card.classList.add("is-playing");
}

// Petit effet de "splash" façon bulle qui éclate au centre d'un bouton
function spawnRipple(el) {
  if (!el) return;
  const ripple = document.createElement("span");
  ripple.className = "ctrl-ripple";
  el.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

// Recentre le carrousel en arc sur la carte du morceau en cours (utile
// quand on change de piste via les boutons du lecteur, pas juste au clic)
function centerArcOnCurrent() {
  if (currentTab !== "music") return;
  const track = QUEUE[queueIndex];
  const card = track && cardsByItem.get(track);
  if (!card) return;
  const idx = Array.from(grid.children).indexOf(card);
  if (idx !== -1) {
    arcCenterIndex = idx;
    layoutArc();
  }
}

function setPlaying(state) {
  if (state && !audioEl.src) return; // rien à jouer
  isPlaying = state;
  iconPlay.style.display = isPlaying ? "none" : "block";
  iconPause.style.display = isPlaying ? "block" : "none";
  btnPlay.classList.toggle("active", isPlaying);
  playerCover.classList.toggle("is-playing", isPlaying);
  document.body.classList.toggle("is-playing", isPlaying);

  if (isPlaying) {
    spawnRipple(btnPlay);
    ensureAudioGraph();
    audioEl.play().catch((err) => {
      console.warn("Lecture bloquée par le navigateur :", err.message);
      isPlaying = false;
      iconPlay.style.display = "block";
      iconPause.style.display = "none";
      btnPlay.classList.remove("active");
      playerCover.classList.remove("is-playing");
      document.body.classList.remove("is-playing");
      updateActiveCard();
    });
  } else {
    audioEl.pause();
  }
  updateActiveCard();
  centerArcOnCurrent();
  runVisualizer();
}

function playAt(index) {
  if (!QUEUE.length) return;
  queueIndex = ((index % QUEUE.length) + QUEUE.length) % QUEUE.length;
  setTrack(QUEUE[queueIndex]);
  setPlaying(true);
}

function playNext() { playAt(queueIndex + (btnShuffle.classList.contains("active") ? randomStep() : 1)); }
function playPrev() { playAt(queueIndex - 1); }
function randomStep() {
  if (QUEUE.length <= 1) return 1;
  let step;
  do { step = Math.floor(Math.random() * QUEUE.length); } while (step === 0);
  return step;
}

btnPlay.addEventListener("click", () => setPlaying(!isPlaying));
btnNext.addEventListener("click", () => { playSound("click"); playNext(); });
btnPrev.addEventListener("click", () => { playSound("click"); playPrev(); });

btnShuffle.addEventListener("click", () => { playSound("click"); btnShuffle.classList.toggle("active"); });
btnRepeat.addEventListener("click", () => { playSound("click"); btnRepeat.classList.toggle("active"); });

likeBtn.addEventListener("click", () => {
  const nowActive = !likeBtn.classList.contains("active");
  likeBtn.classList.toggle("active");
  playSound(nowActive ? "favorite" : "click");
  const track = QUEUE[queueIndex];
  if (track) track.favorite = nowActive;
});

progressTrack.addEventListener("click", (e) => {
  if (!audioEl.duration) return;
  const rect = progressTrack.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  audioEl.currentTime = ratio * audioEl.duration;
  updateProgressUI();
});

volumeSlider.addEventListener("input", () => {
  audioEl.volume = Number(volumeSlider.value);
});
audioEl.volume = Number(volumeSlider.value);

audioEl.addEventListener("timeupdate", () => { if (!isSeeking) updateProgressUI(); });
audioEl.addEventListener("loadedmetadata", updateProgressUI);
audioEl.addEventListener("ended", () => {
  if (btnRepeat.classList.contains("active")) {
    audioEl.currentTime = 0;
    audioEl.play();
  } else {
    playNext();
  }
});

// ---- Égaliseur réel — Web Audio API branché sur le flux audio ----
const visualizer = document.getElementById("visualizer");
const BAR_COUNT = 20;
for (let i = 0; i < BAR_COUNT; i++) {
  const bar = document.createElement("span");
  bar.className = "eq-bar";
  bar.style.height = "3px";
  visualizer.appendChild(bar);
}
const bars = visualizer.querySelectorAll(".eq-bar");

let audioCtx = null;
let analyser = null;
let freqData = null;
let vizRunning = false;

// L'AudioContext ne peut être créé/démarré qu'après une interaction
// utilisateur (politique autoplay des navigateurs) — on le fait donc
// paresseusement, au premier "play".
function ensureAudioGraph() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audioEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch (err) {
    console.warn("Web Audio API indisponible, égaliseur en mode simulé.", err);
    analyser = null;
  }
}

function runVisualizer() {
  if (isPlaying && !vizRunning) {
    vizRunning = true;
    tickVisualizer();
  } else if (!isPlaying) {
    vizRunning = false;
    bars.forEach((bar) => { bar.style.height = "3px"; });
  }
}

function tickVisualizer() {
  if (!vizRunning) return;

  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

  if (analyser) {
    analyser.getByteFrequencyData(freqData);
    const step = Math.floor(freqData.length / BAR_COUNT) || 1;
    bars.forEach((bar, i) => {
      const v = freqData[i * step] || 0;
      const h = 3 + (v / 255) * 26;
      bar.style.height = h + "px";
    });
  } else {
    // secours si Web Audio API indisponible : petite animation simulée
    bars.forEach((bar) => { bar.style.height = 3 + Math.random() * 22 + "px"; });
  }

  requestAnimationFrame(tickVisualizer);
}

// ---- Initialisation ----
updateProgressUI();
renderTab();

loadSpotifyPlaylist().then(() => {
  QUEUE = MUSIC_ITEMS;
  if (currentTab === "music") renderTab();
});
