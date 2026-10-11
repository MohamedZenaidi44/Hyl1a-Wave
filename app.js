/* Hyl1a Wave — lit data/local.json et data/youtube.json (s'ils existent).
   Sans données, une petite démo s'affiche. */

const DEMO = {
  tracks: [
    { id: "d1", t: "Nuit Étoilée", a: "Aïsha K.", al: "Sessions", d: 227 },
    { id: "d2", t: "Horizon Bleu", a: "Karim D.", al: "Été Continu", d: 242 },
    { id: "d3", t: "Marée Haute", a: "Léa Or.", al: "Salt", d: 178 }
  ],
  playlists: [
    { name: "Démo", tracks: ["d1", "d2", "d3"] }
  ]
};

const DATA_FILES = ["data/local.json", "data/youtube.json"];

const IC = {
  home: "M12 3 3 10v11h6v-7h6v7h6V10z",
  search: "M10 2a8 8 0 1 0 5 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z",
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zm8 0h4v14h-4z",
  prev: "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  next: "M16 6h2v12h-2zM6 18l8.5-6L6 6z",
  shuffle: "M16 3h5v5l-1.8-1.8L5.4 20 4 18.6 17.8 4.8zM4 5.4 5.4 4l5.4 5.4-1.4 1.4zm10.5 8.5 1.4-1.4 3.3 3.3L21 14v5h-5l1.8-1.8z",
  repeat: "M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z",
  heart: "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z",
  vol: "M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z",
  mute: "M3 9v6h4l5 5V4L7 9zm13.6 3-2.4-2.4 1.4-1.4 2.4 2.4 2.4-2.4 1.4 1.4-2.4 2.4 2.4 2.4-1.4 1.4-2.4-2.4-2.4 2.4-1.4-1.4z",
  lib: "M4 4h2v16H4zm5 0h2v16H9zm4.2.5 1.9-.5 4.2 15.5-1.9.5z",
  more: "M5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  queue: "M3 6h12v2H3zm0 5h12v2H3zm0 5h8v2H3zm13-3v6l5-3z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  up: "M7 14l5-5 5 5z",
  down: "M7 10l5 5 5-5z",
  x: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z",
  plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
  history: "M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-2-4.9L15 10h7V3l-2.6 2.6A8.9 8.9 0 0 0 13 3zm-1 5v5l4 2 .8-1.4-3.3-1.7V8z"
};

const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n]}"/></svg>`;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const fmtLong = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${Math.max(1, m)} min`;
};
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uniq = a => [...new Set(a)];
const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const esc = s =>
  String(s).replace(/[&<>"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[m]));

const grad = s => {
  const h = [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
  return [
    `hsl(${h} 70% 50%)`,
    `hsl(${(h + 50) % 360} 70% 32%)`
  ];
};

const cvStyle = o =>
  `--a:${o.c[0]};--b:${o.c[1]}${o.th ? `;background:url('${encodeURI(o.th).replace(/'/g, "%27")}') center/cover` : ""}`;

const cv = o =>
  `<div class="cv" style="${cvStyle(o)}">${o.th ? "" : (o.h || esc(o.l))}</div>`;

const ACC = "var(--acc)";
const FAV_COVER = { c: [ACC, ACC], h: svg("heart") };
const HIST_COVER = { c: ["var(--hov)", "var(--hov)"], h: svg("history") };

/* ---------- Stockage local (jamais d'erreur bloquante) ---------- */

const ls = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
};

/* ---------- État ---------- */

let TR = [];
let ID = new Map();      // id de titre → index dans TR
let PL = [];
let LIB = [];
let Q = [];              // ordre de lecture (index dans TR)
let qi = 0;              // position courante dans Q
let ctx = [];            // liste d'origine (pour retrouver l'ordre en désactivant l'aléatoire)
let qNext = 0;           // nombre de titres ajoutés à la main juste après le titre courant

let playing = false;
let cur = 0;
let dur = 0;
let shuffle = false;
let rep = 0;             // 0 : non, 1 : liste, 2 : titre
let vol = .7;
let muted = false;

let view = "home";       // home | search | lib | fav | hist | queue | col
let col = null;          // collection affichée (playlist, artiste, album, playlist perso)
let prevNav = null;
let filter = "all";
let term = "";
let ctxIds = [];         // titres de la vue affichée : file créée quand on clique un titre

const validArr = v => Array.isArray(v) ? v.filter(x => typeof x === "string") : [];

let liked = new Set(validArr(ls.get("hw-liked", [])));
let hist = validArr(ls.get("hw-hist", []));
let mine = (() => {
  const a = ls.get("hw-playlists", []);
  return Array.isArray(a)
    ? a.filter(p => p && typeof p.id === "string" && typeof p.name === "string")
        .map(p => ({ id: p.id, name: p.name, tracks: validArr(p.tracks) }))
    : [];
})();

{
  const p = ls.get("hw-prefs", {}) || {};
  if (typeof p.vol === "number") vol = clamp(p.vol, 0, 1);
  muted = !!p.muted;
  shuffle = !!p.shuffle;
  rep = [0, 1, 2].includes(p.rep) ? p.rep : 0;
}

const saveLiked = () => ls.set("hw-liked", [...liked]);
const savePrefs = () => ls.set("hw-prefs", { vol, muted, shuffle, rep });
const saveMine = () => ls.set("hw-playlists", mine);
const saveHist = () => ls.set("hw-hist", hist);

function saveState() {
  if (!Q.length || !TR.length) return;
  ls.set("hw-state", {
    q: Q.map(i => TR[i].id),
    qi,
    ctx: ctx.map(i => TR[i].id),
    qNext,
    pos: Math.floor(cur)
  });
}

const T = () => TR[Q[qi]];

/* ---------- Données ---------- */

function build(list) {
  TR = [];
  ID = new Map();
  const pls = [];

  list.forEach(d => {
    (d.tracks || []).forEach(t => {
      if (!t || !t.id || ID.has(t.id)) return;      // pas de doublons entre fichiers

      t.t = t.t || "Sans titre";
      t.c = grad(t.t);
      t.l = t.t[0];
      t.d = +t.d || 0;
      t.k = norm([t.t, t.a, t.al].filter(Boolean).join(" "));

      if (!t.th && t.yt) {
        t.th = `https://i.ytimg.com/vi/${t.yt}/mqdefault.jpg`;
      }

      ID.set(t.id, TR.length);
      TR.push(t);
    });

    pls.push(...(d.playlists || []));
  });

  PL = pls
    .map(p => {
      const ids = uniq((p.tracks || [])
        .map(id => ID.get(id))
        .filter(i => i !== undefined));

      return {
        k: "pl",
        key: "pl:" + p.name,
        n: p.name,
        ids,
        s: "Playlist · " + plural(ids.length, "titre"),
        c: grad(p.name),
        l: (p.name || "?")[0],
        th: TR[ids[0]] && TR[ids[0]].th
      };
    })
    .filter(p => p.ids.length);

  buildLib();
}

function buildLib() {
  const grp = (k, key, label) =>
    [...new Set(TR.map(t => t[key]).filter(Boolean))].map(n => {
      const ids = TR
        .map((t, i) => t[key] === n ? i : -1)
        .filter(i => i >= 0);

      return {
        k,
        key: k + ":" + n,
        n,
        ids,
        s: label,
        c: grad(n),
        l: n[0],
        th: TR[ids[0]].th
      };
    });

  const MY = mine.map(p => {
    const ids = uniq(p.tracks.map(id => ID.get(id)).filter(i => i !== undefined));

    return {
      k: "my",
      key: "my:" + p.id,
      uid: p.id,
      n: p.name,
      ids,
      s: "Ma playlist · " + plural(ids.length, "titre"),
      c: grad(p.name),
      l: (p.name || "?")[0],
      th: ids.length ? TR[ids[0]].th : ""
    };
  });

  LIB = [
    ...MY,
    ...PL,
    ...grp("ar", "a", "Artiste"),
    ...grp("al", "al", "Album")
  ];

  if (col) col = LIB.find(l => l.key === col.key) || null;
}

/* ---------- Volume ---------- */

const au = new Audio();
au.onended = () => step(1, true);
au.onerror = () => { if (au.getAttribute("src")) step(1, true, true); };

function applyVol() {
  const v = muted ? 0 : vol;
  au.volume = v;
  if (ypReady) yp.setVolume(v * 100);
  $$(".vl").forEach(x => x.value = v);
  $$(".mute").forEach(b => {
    b.innerHTML = svg(muted || vol === 0 ? "mute" : "vol");
    b.setAttribute("aria-label", muted ? "Réactiver le son" : "Couper le son");
  });
}

function setVol(v) {
  vol = clamp(v, 0, 1);
  muted = false;
  applyVol();
  savePrefs();
}

function toggleMute() {
  if (muted || vol === 0) {
    muted = false;
    if (vol === 0) vol = .5;
  } else {
    muted = true;
  }
  applyVol();
  savePrefs();
}

/* ---------- Lecteurs : fichier audio + YouTube ---------- */

let tick;
let ticks = 0;
let yp = null;
let ypReady = false;
let ypLoading = false;
let loadedYt = null;
let pendingYt = null;
let errs = 0;
let lastCmd = 0;
let token = 0;
let loggedToken = -1;
let seeking = false;

function ytInit() {
  if (ypLoading) return;

  ypLoading = true;

  const mk = () => {
    yp = new YT.Player("ytp", {
      width: "100%",
      height: "100%",
      playerVars: {
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady() {
          ypReady = true;
          applyVol();

          if (pendingYt) {
            loadedYt = pendingYt.id;
            yp.loadVideoById({ videoId: pendingYt.id, startSeconds: pendingYt.at });
            pendingYt = null;
          }
        },

        onStateChange(e) {
          if (e.data === 1) {
            errs = 0;
            /* lecture lancée depuis les boutons de l'iframe YouTube */
            if (!playing && Date.now() - lastCmd > 600) syncPlaying(true);
          }

          if (e.data === 2 && playing && Date.now() - lastCmd > 600) {
            /* pause depuis l'iframe */
            syncPlaying(false);
          }

          if (e.data === 0) step(1, true);
        },

        onError() {
          if (++errs >= Q.length) return setPlay(false);
          step(1, true, true);
        }
      }
    });
  };

  if (window.YT && YT.Player) {
    return mk();
  }

  window.onYouTubeIframeAPIReady = mk;

  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
}

function startYt(id, at = 0) {
  if (!ypReady) {
    pendingYt = { id, at };
    return;
  }

  if (loadedYt !== id) {
    loadedYt = id;
    yp.loadVideoById({ videoId: id, startSeconds: at });
  } else {
    yp.playVideo();
  }
}

/* Pochette agrandie : maxresdefault si elle existe, sinon la miniature */
const artCache = new Map();

function bigArt(el, t) {
  if (!el || !t) return;

  el.dataset.tid = t.id;

  if (!t.yt) return;

  const url = `https://i.ytimg.com/vi/${t.yt}/maxresdefault.jpg`;
  const apply = ok => {
    if (ok && el.dataset.tid === t.id) el.style.backgroundImage = `url('${url}')`;
  };

  if (artCache.has(url)) return apply(artCache.get(url));

  const im = new Image();
  im.onload = () => {
    const ok = im.naturalWidth >= 640;
    artCache.set(url, ok);
    apply(ok);
  };
  im.onerror = () => artCache.set(url, false);
  im.src = url;
}

/* ---------- Création et navigation de la file ---------- */

const shuf = a => {
  a = a.slice();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
};

function startQueue(list, first = 0) {
  if (!list.length) return;

  first = clamp(first, 0, list.length - 1);
  ctx = list.slice();
  qNext = 0;

  if (shuffle) {
    Q = [list[first], ...shuf(list.filter((_, k) => k !== first))];
    qi = 0;
  } else {
    Q = list.slice();
    qi = first;
  }

  load(true);
  saveState();
}

/* Bouton « Lecture » d'une liste ; avec l'aléatoire actif, on part d'un titre au hasard */
function playList(list, forceShuffle) {
  if (!list.length) return;

  if (forceShuffle) setShuffle(true);

  startQueue(list, shuffle ? Math.floor(Math.random() * list.length) : 0);
}

function setShuffle(on) {
  if (on === shuffle) return;

  shuffle = on;
  savePrefs();

  if (!Q.length) return;

  const manual = Q.slice(qi + 1, qi + 1 + qNext);

  if (on) {
    Q = [...Q.slice(0, qi + 1), ...manual, ...shuf(Q.slice(qi + 1 + qNext))];
  } else {
    const c = Q[qi];
    let ci = ctx.indexOf(c);
    let base;

    if (ci < 0) {
      base = [c, ...ctx];
      ci = 0;
    } else {
      base = ctx.slice();
    }

    Q = [...base.slice(0, ci + 1), ...manual, ...base.slice(ci + 1)];
    qi = ci;
  }

  saveState();
}

function enqueue(idxs, next) {
  if (!idxs.length) return;

  Q.splice(next ? qi + 1 : qi + 1 + qNext, 0, ...idxs);
  qNext += idxs.length;

  toast(next
    ? "Sera lu ensuite"
    : idxs.length > 1 ? `${idxs.length} titres ajoutés à la file` : "Ajouté à la file d'attente");

  saveState();
  renderChrome();
}

function removeFromQueue(pos) {
  if (pos <= qi || pos >= Q.length) return;

  Q.splice(pos, 1);

  if (pos <= qi + qNext) qNext = Math.max(0, qNext - 1);

  saveState();
  renderChrome();
}

function moveInQueue(from, to) {
  if (from <= qi || to <= qi || from >= Q.length || to >= Q.length || from === to) return false;

  const fromManual = from <= qi + qNext;
  const [x] = Q.splice(from, 1);

  Q.splice(to, 0, x);

  if (!fromManual && to <= qi + qNext) qNext++;
  else if (fromManual && to > qi + qNext) qNext--;

  saveState();
  renderChrome();
  return true;
}

function jumpTo(pos) {
  if (pos === qi || pos < 0 || pos >= Q.length) return;

  if (pos > qi) qNext -= Math.min(qNext, pos - qi);

  qi = pos;
  load(true);
  saveState();
}

function load(play, at = 0) {
  const t = T();

  if (!t) return;

  token++;
  cur = at;
  dur = t.d;
  au.pause();
  pendingYt = null;
  loadedYt = null;

  if (ypReady && !t.yt) {
    yp.pauseVideo();
  }

  $("#yt").classList.toggle("show", !!t.yt);

  if (t.yt) {
    ytInit();
  }

  if (t.src) {
    au.src = t.src;
    if (at) au.currentTime = at;
  } else {
    au.removeAttribute("src");
  }

  paintTrack(t);
  setMedia(t);
  setPlay(play);
}

function logPlay(t) {
  if (hist[0] === t.id) return;

  hist = [t.id, ...hist.filter(x => x !== t.id)].slice(0, 100);
  saveHist();
}

/* Mise à jour de l'interface quand l'état de lecture change depuis l'iframe YouTube */
function syncPlaying(p) {
  playing = p;
  clearInterval(tick);

  if (p) startTick();

  paintPlayBtn();
  markRows();
}

function startTick() {
  clearInterval(tick);

  tick = setInterval(() => {
    const T0 = T();

    if (!T0) return;

    cur = T0.yt
      ? (ypReady && loadedYt === T0.yt && yp.getCurrentTime ? yp.getCurrentTime() : cur)
      : T0.src && au.currentTime
        ? au.currentTime
        : cur + .25;

    if (T0.yt && ypReady && loadedYt === T0.yt && yp.getDuration) {
      const dd = yp.getDuration();

      if (dd > 1 && Math.abs(dd - dur) > 1) {
        dur = dd;
        $$(".sk").forEach(x => x.max = dd);
        $$(".td").forEach(x => x.textContent = fmt(dd));
      }
    }

    if (!T0.yt && !T0.src && cur >= T0.d) {
      return step(1, true);
    }

    if (!seeking) paintProgress();

    if (++ticks % 20 === 0) saveState();
  }, 250);
}

function setPlay(p) {
  playing = p;
  lastCmd = Date.now();

  clearInterval(tick);

  const t = T();

  paintPlayBtn();

  if (!t) return;

  if (p) {
    if (loggedToken !== token) {
      loggedToken = token;
      logPlay(t);
    }

    if (t.yt) {
      au.pause();
      startYt(t.yt, cur);
    } else if (t.src) {
      au.play().catch(() => {});
    }

    startTick();
  } else {
    pendingYt = null;
    au.pause();

    if (ypReady) {
      yp.pauseVideo();
    }
  }

  renderChrome();
}

function step(dir, auto, force) {
  if (!Q.length) return;

  if (auto && sleepEOT) {
    sleepEOT = false;
    sleepUi();
    return setPlay(false);
  }

  if (auto && rep === 2 && !force) {
    loadedYt = null;
    return load(true);
  }

  if (dir > 0) {
    if (qi + 1 < Q.length) {
      qi++;
      if (qNext > 0) qNext--;
    } else if (rep === 1 || !auto) {
      if (shuffle) Q = shuf(Q);
      qi = 0;
      qNext = 0;
    } else {
      return setPlay(false);
    }
  } else if (qi > 0) {
    qi--;
  } else if (rep === 1) {
    qi = Q.length - 1;
  } else {
    return seekTo(0);
  }

  load(true);
  saveState();
}

function prev() {
  if (cur > 3) seekTo(0);
  else step(-1);
}

function seekTo(x) {
  const t = T();

  if (!t) return;

  x = clamp(x, 0, dur || t.d || 0);
  cur = x;

  if (t.yt && ypReady && loadedYt === t.yt) {
    yp.seekTo(x, true);
  } else if (t.src) {
    au.currentTime = x;
  }

  paintProgress();
}

/* ---------- Affichage de la barre, du plein écran et des états ---------- */

function paintTrack(t) {
  $("#bT").textContent = t.t;
  $("#bA").textContent = t.a || "";

  $("#bCv").style.cssText = cvStyle(t);
  $("#bCv").textContent = t.th ? "" : t.l;

  $("#npT").textContent = t.t;
  $("#npA").textContent = [t.a, t.al].filter(Boolean).join(" · ");

  const big = $("#npCv");

  big.style.cssText = cvStyle(t);
  big.textContent = t.th ? "" : t.l;
  bigArt(big, t);

  $$(".sk").forEach(x => {
    x.max = t.d;
    x.value = cur;
  });

  $$(".td").forEach(x => x.textContent = fmt(t.d));
  paintProgress();
}

function paintProgress() {
  $$(".sk").forEach(x => {
    x.value = cur;
    x.setAttribute("aria-valuetext", `${fmt(cur)} sur ${fmt(dur)}`);
  });

  $$(".tc").forEach(x => x.textContent = fmt(cur));

  $("#mp").style.width = (dur ? clamp(cur / dur * 100, 0, 100) : 0) + "%";
}

function paintPlayBtn() {
  $$("[data-act=pp]").forEach(b => {
    b.innerHTML = svg(playing ? "pause" : "play");
    b.setAttribute("aria-label", playing ? "Pause" : "Lecture");
  });
}

function setMedia(t) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.t,
      artist: t.a || "",
      album: t.al || "",
      artwork: t.th ? [{ src: t.th, sizes: "320x180" }] : []
    });
  } catch (e) {}
}

if ("mediaSession" in navigator) {
  const h = (n, f) => { try { navigator.mediaSession.setActionHandler(n, f); } catch (e) {} };

  h("play", () => setPlay(true));
  h("pause", () => setPlay(false));
  h("previoustrack", () => prev());
  h("nexttrack", () => step(1));
}

/* ---------- Rendu ---------- */

function trk(i, n) {
  const t = TR[i];
  const on = Q[qi] === i;
  const lk = liked.has(t.id);

  return `
    <div class="tr ${on ? "on" : ""}" data-play="${i}">
      <span class="n" data-n="${n}">${on && playing ? "♫" : n}</span>
      <button class="t" data-play="${i}" ${on ? 'aria-current="true"' : ""}>
        ${cv(t)}
        <span style="min-width:0">
          <b>${esc(t.t)}</b>
          <small>${esc(t.a || "")}</small>
        </span>
      </button>
      <span class="al d">${esc(t.al || "")}</span>
      <button class="ic mini heart ${lk ? "on" : ""}" data-like="${esc(t.id)}" aria-pressed="${lk}" aria-label="${lk ? "Retirer des favoris" : "Ajouter aux favoris"} : ${esc(t.t)}">${svg("heart")}</button>
      <span class="d">${t.d ? fmt(t.d) : ""}</span>
      <button class="ic mini" data-menu="${i}" aria-haspopup="menu" aria-label="Plus d'options : ${esc(t.t)}">${svg("more")}</button>
    </div>
  `;
}

function qrow(pos, kind) {
  const t = TR[Q[pos]];
  const isCur = kind === "cur";

  const acts = isCur ? "" : `
    <span class="acts">
      <button class="ic mini" data-qa="up" data-pos="${pos}" aria-label="Monter : ${esc(t.t)}">${svg("up")}</button>
      <button class="ic mini" data-qa="down" data-pos="${pos}" aria-label="Descendre : ${esc(t.t)}">${svg("down")}</button>
      <button class="ic mini" data-qa="rm" data-pos="${pos}" aria-label="Retirer de la file : ${esc(t.t)}">${svg("x")}</button>
    </span>`;

  return `
    <div class="tr q ${isCur ? "on" : ""}" ${isCur ? "" : `draggable="true" data-pos="${pos}"`}>
      <span class="n">${isCur ? (playing ? "♫" : "") : "≡"}</span>
      <button class="t" data-qi="${pos}">
        ${cv(t)}
        <span style="min-width:0">
          <b>${esc(t.t)}</b>
          <small>${esc(t.a || "")}</small>
        </span>
      </button>
      ${acts}
    </div>
  `;
}

const rows = list => list.map((i, n) => trk(i, n + 1)).join("");

function libItems() {
  const pins = filter === "all"
    ? `
      <button class="li ${view === "fav" ? "selected" : ""}" data-nav="fav">
        ${cv(FAV_COVER)}
        <span><b>Titres likés</b><small>${plural(likedIdx().length, "titre")}</small></span>
      </button>
      <button class="li ${view === "hist" ? "selected" : ""}" data-nav="hist">
        ${cv(HIST_COVER)}
        <span><b>Historique</b><small>${plural(histIdx().length, "titre")}</small></span>
      </button>`
    : "";

  return pins + LIB
    .filter(l => filter === "all" || l.k === filter || (filter === "pl" && l.k === "my"))
    .map(l => `
      <button class="li ${view === "col" && col && col.key === l.key ? "selected" : ""}" data-col="${esc(l.key)}">
        ${cv(l)}
        <span>
          <b>${esc(l.n)}</b>
          <small>${esc(l.s)}</small>
        </span>
      </button>
    `)
    .join("");
}

const pills = () => [
  ["all", "Tout"], ["pl", "Playlists"], ["ar", "Artistes"], ["al", "Albums"]
].map(([k, n]) => `<button class="pill ${filter === k ? "on" : ""}" data-k="${k}">${n}</button>`).join("");

const likedIdx = () => [...liked].reverse().map(id => ID.get(id)).filter(i => i !== undefined);
const histIdx = () => hist.map(id => ID.get(id)).filter(i => i !== undefined);

function renderLib() {
  $("#lib").innerHTML = libItems();
}

function renderView() {
  const h = new Date().getHours();
  const g = h < 5 || h >= 18 ? "Bonsoir" : "Bonjour";

  let html = "";
  let list = [];

  if (view === "search") {
    const words = norm(term).split(/\s+/).filter(Boolean);
    const match = s => words.every(w => s.includes(w));

    list = TR.map((_, i) => i).filter(i => match(TR[i].k));

    const cols = words.length
      ? LIB.filter(l => ["ar", "pl", "my"].includes(l.k) && match(norm(l.n))).slice(0, 6)
      : [];

    html =
      `<h1>${term ? "Résultats" : "Tous les titres"}</h1>` +
      (cols.length
        ? `<h2>Artistes et playlists</h2>
           <div class="cards">${cols.map(l => `
             <button class="card" data-col="${esc(l.key)}">
               ${cv(l)}
               <b>${esc(l.n)}</b>
               <small>${esc(l.s)}</small>
             </button>`).join("")}</div>
           <h2>Titres</h2>`
        : "") +
      (list.length
        ? rows(list)
        : `<p class="empty">Aucun titre pour « ${esc(term)} ». Essaie un autre mot.</p>`);

  } else if (view === "col" && col) {
    list = col.ids;

    const total = list.reduce((s, i) => s + TR[i].d, 0);
    const kind = { pl: "PLAYLIST", my: "MA PLAYLIST", ar: "ARTISTE", al: "ALBUM" }[col.k];

    html = `
      <button class="back" id="backPlaylists">← Retour</button>

      <div class="playlist-head">
        ${cv(col)}
        <div>
          <small>${kind}</small>
          <h1>${esc(col.n)}</h1>
          <p>${plural(list.length, "titre")}${total ? " · " + fmtLong(total) : ""}</p>
        </div>
      </div>

      <div class="actions">
        <button class="ic pp big" data-act="playcol" aria-label="Lire ${esc(col.n)}">${svg("play")}</button>
        <button class="ic" data-act="shufcol" aria-label="Lecture aléatoire" title="Lecture aléatoire">${svg("shuffle")}</button>
        <button class="ic" data-act="colmenu" aria-haspopup="menu" aria-label="Plus d'options">${svg("more")}</button>
      </div>

      <div class="playlist-tracks">
        ${list.length
          ? rows(list)
          : `<p class="empty">Cette playlist est vide. Ajoute des titres avec le menu « ⋯ » d'un morceau.</p>`}
      </div>
    `;

  } else if (view === "fav") {
    list = likedIdx();

    html = `
      <div class="playlist-head">
        ${cv(FAV_COVER)}
        <div>
          <small>PLAYLIST</small>
          <h1>Titres likés</h1>
          <p>${plural(list.length, "titre")}</p>
        </div>
      </div>
      <div class="actions">
        <button class="ic pp big" data-act="playlist" aria-label="Tout lire">${svg("play")}</button>
        <button class="ic" data-act="shuflist" aria-label="Lecture aléatoire" title="Lecture aléatoire">${svg("shuffle")}</button>
      </div>
      ${list.length ? rows(list) : `<p class="empty">Aucun favori pour l'instant. Touche le cœur d'un titre pour l'ajouter ici.</p>`}
    `;

  } else if (view === "hist") {
    list = histIdx();

    html = `
      <div class="playlist-head">
        ${cv(HIST_COVER)}
        <div>
          <small>HISTORIQUE</small>
          <h1>Écoutés récemment</h1>
          <p>${plural(list.length, "titre")}</p>
        </div>
      </div>
      <div class="actions">
        <button class="ic pp big" data-act="playlist" aria-label="Tout lire">${svg("play")}</button>
        ${list.length ? `<button class="link" data-act="clearhist">Effacer l'historique</button>` : ""}
      </div>
      ${list.length ? rows(list) : `<p class="empty">Rien d'écouté pour l'instant.</p>`}
    `;

  } else if (view === "queue") {
    const manual = [];
    const rest = [];

    for (let p = qi + 1; p < Q.length; p++) (p <= qi + qNext ? manual : rest).push(p);

    const MAX = 100;

    html = `
      <h1>File d'attente</h1>
      <h2>En cours de lecture</h2>
      ${Q.length ? qrow(qi, "cur") : ""}
      ${manual.length ? `
        <div class="sub"><h2>Dans la file d'attente</h2><button class="link" data-act="clearq">Vider</button></div>
        ${manual.map(p => qrow(p)).join("")}` : ""}
      ${rest.length ? `
        <h2>Ensuite</h2>
        ${rest.slice(0, MAX).map(p => qrow(p)).join("")}
        ${rest.length > MAX ? `<p class="empty">… et ${rest.length - MAX} autres titres</p>` : ""}` : `
        <p class="empty">Rien après ce titre. Ajoute des morceaux avec le menu « ⋯ ».</p>`}
    `;

  } else if (view === "lib") {
    html = `
      <h1>Bibliothèque</h1>
      <div class="actions" style="margin-top:0">
        <div class="pills" style="padding:0;flex:1">${pills()}</div>
        <button class="ic" data-act="newpl" aria-label="Créer une playlist">${svg("plus")}</button>
      </div>
      <div>${libItems()}</div>
    `;

  } else {
    list = TR.map((_, i) => i);

    const recent = histIdx().slice(0, 6);
    const tiles = [];

    if (liked.size) {
      tiles.push(`<button class="qt" data-nav="fav">${cv(FAV_COVER)}Titres likés</button>`);
    }

    LIB.filter(l => l.k === "my" || l.k === "pl")
      .slice(0, 6 - tiles.length)
      .forEach(l => tiles.push(`<button class="qt" data-col="${esc(l.key)}">${cv(l)}${esc(l.n)}</button>`));

    html = `
      <h1>${g}</h1>

      ${tiles.length ? `<div class="quick">${tiles.join("")}</div>` : ""}

      <h2>${recent.length ? "Écouté récemment" : "Reprendre"}</h2>

      <div class="cards">
        ${(recent.length ? recent : list.slice(0, 6))
          .map(i => `
            <button class="card" data-play="${i}">
              ${cv(TR[i])}
              <b>${esc(TR[i].t)}</b>
              <small>${esc(TR[i].a || "")}</small>
            </button>
          `)
          .join("")}
      </div>

      <h2>Tous les titres</h2>

      ${rows(list)}
    `;
  }

  ctxIds = list;
  $("#view").innerHTML = html;
  markRows();
}

/* Met à jour les lignes sans les reconstruire (garde le focus clavier) */
function markRows() {
  const c = Q[qi];
  const t = T();

  $$(".tr[data-play]").forEach(r => {
    const on = +r.dataset.play === c;
    const n = r.querySelector(".n");

    r.classList.toggle("on", on);

    if (n) n.textContent = on && playing ? "♫" : n.dataset.n;

    const b = r.querySelector("button.t");

    if (b) on ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current");
  });

  $$("[data-like]").forEach(b => setHeart(b, liked.has(b.dataset.like), TR[ID.get(b.dataset.like)]));
  $$("[data-act=like]").forEach(b => setHeart(b, !!t && liked.has(t.id), t));
}

function setHeart(b, on, t) {
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", on);
  b.setAttribute("aria-label", (on ? "Retirer des favoris" : "Ajouter aux favoris") + (t && b.classList.contains("mini") ? " : " + t.t : ""));
}

function renderNow() {
  const t = T();

  if (!t) {
    $("#now").innerHTML = "";
    return;
  }

  const nx = Q.slice(qi + 1, qi + 4);

  $("#now").innerHTML = `
    <div class="cv" id="nowCv" style="${cvStyle(t)}">${t.th ? "" : esc(t.l)}</div>

    <div class="row">
      <div style="min-width:0">
        <h3>${esc(t.t)}</h3>
        <small style="color:var(--mu)">
          ${esc([t.a, t.al].filter(Boolean).join(" · "))}
        </small>
      </div>
      <button class="ic heart ${liked.has(t.id) ? "on" : ""}" data-like="${esc(t.id)}" aria-pressed="${liked.has(t.id)}" aria-label="${liked.has(t.id) ? "Retirer des favoris" : "Ajouter aux favoris"}">${svg("heart")}</button>
    </div>

    ${
      nx.length
        ? `
          <div class="row q"><span>À suivre</span><button class="link" data-act="queue">Ouvrir la file</button></div>

          ${nx
            .map((i, k) => `
              <button class="li" data-qi="${qi + 1 + k}">
                ${cv(TR[i])}
                <span>
                  <b>${esc(TR[i].t)}</b>
                  <small>${esc(TR[i].a || "")}</small>
                </span>
              </button>
            `)
            .join("")
          }
        `
        : ""
    }
  `;

  bigArt($("#nowCv"), t);
}

function renderChrome() {
  $$("[data-nav]").forEach(b => {
    if (!b.closest(".tabs") && !b.closest(".nav")) return;

    const k = b.dataset.nav;
    const on = k === view || (k === "lib" && ["col", "hist", "queue"].includes(view));

    b.classList.toggle("on", on);
  });

  renderNow();

  $$("[data-act=shuf]").forEach(b => {
    b.classList.toggle("on", shuffle);
    b.setAttribute("aria-pressed", shuffle);
  });

  $$("[data-act=rep]").forEach(b => {
    b.classList.toggle("on", rep > 0);
    b.setAttribute("aria-pressed", rep > 0);
    b.dataset.mode = rep;
    b.title = ["Répéter", "Répéter la liste", "Répéter le titre"][rep];
    b.setAttribute("aria-label", b.title);
  });

  sleepUi();
  markRows();

  if (view === "queue") renderView();
}

/* ---------- Navigation ---------- */

function go(v, c = null) {
  if (v === "col" && view !== "col") prevNav = { v: view, c: col };

  view = v;
  col = v === "col" ? c : null;

  const m = $(".main");

  m.style.scrollBehavior = "auto";
  m.scrollTop = 0;
  m.style.scrollBehavior = "";

  renderLib();
  renderChrome();

  if (view !== "queue") renderView();

  if (v === "search" && matchMedia("(min-width:761px)").matches) $("#q").focus();
}

/* ---------- Favoris, playlists perso ---------- */

function toggleLike(id) {
  if (!ID.has(id)) return;

  liked.has(id) ? liked.delete(id) : liked.add(id);

  saveLiked();
  markRows();
  renderNow();

  if (view === "fav") renderView();

  renderLib();
}

function afterPlaylistChange() {
  buildLib();
  renderLib();

  if (view === "col" && !col) view = "home";

  renderView();
  renderChrome();
}

async function newPlaylist(firstId) {
  const name = await ask("Nouvelle playlist", "Ma playlist " + (mine.length + 1));

  if (!name) return null;

  const p = {
    id: "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: name.slice(0, 60),
    tracks: firstId ? [firstId] : []
  };

  mine.push(p);
  saveMine();
  afterPlaylistChange();
  toast(firstId ? `Ajouté à « ${p.name} »` : `Playlist « ${p.name} » créée`);

  return p;
}

function addToPlaylist(pid, trackId) {
  const p = mine.find(x => x.id === pid);

  if (!p) return;

  if (p.tracks.includes(trackId)) return toast(`Déjà dans « ${p.name} »`);

  p.tracks.push(trackId);
  saveMine();
  afterPlaylistChange();
  toast(`Ajouté à « ${p.name} »`);
}

function removeFromPlaylist(pid, trackId) {
  const p = mine.find(x => x.id === pid);

  if (!p) return;

  p.tracks = p.tracks.filter(x => x !== trackId);
  saveMine();
  afterPlaylistChange();
}

async function renamePlaylist(pid) {
  const p = mine.find(x => x.id === pid);

  if (!p) return;

  const name = await ask("Renommer la playlist", p.name);

  if (!name) return;

  p.name = name.slice(0, 60);
  saveMine();
  afterPlaylistChange();
}

function deletePlaylist(pid) {
  const p = mine.find(x => x.id === pid);

  if (!p || !confirm(`Supprimer la playlist « ${p.name} » ?`)) return;

  mine = mine.filter(x => x.id !== pid);
  saveMine();

  if (col && col.uid === pid) {
    view = "home";
    col = null;
  }

  afterPlaylistChange();
}

/* ---------- Menus, dialogues, messages ---------- */

let menuItems = [];
let menuReturn = null;

function openMenu(items, anchor) {
  const m = $("#menu");
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;

  menuItems = items;
  m.innerHTML = items
    .map((it, k) => `<button role="menuitem" data-mi="${k}"${it.danger ? ' class="danger"' : ""}>${esc(it.l)}</button>`)
    .join("");
  m.hidden = false;

  if (matchMedia("(min-width:761px)").matches) {
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    const x = clamp(r.right - w, 8, Math.max(8, innerWidth - w - 8));
    let y = r.bottom + 4;

    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);

    m.style.left = x + "px";
    m.style.top = y + "px";
  } else {
    m.style.left = m.style.top = "";
  }

  menuReturn = anchor.focus ? anchor : null;
  m.querySelector("button").focus();
}

function closeMenu(refocus) {
  const m = $("#menu");

  if (m.hidden) return;

  m.hidden = true;

  if (refocus && menuReturn && document.contains(menuReturn)) menuReturn.focus();
}

function trackMenu(i, anchor) {
  const t = TR[i];
  const rect = anchor.getBoundingClientRect();

  const items = [
    { l: "Lire ensuite", f: () => enqueue([i], true) },
    { l: "Ajouter à la file d'attente", f: () => enqueue([i], false) },
    { l: liked.has(t.id) ? "Retirer des favoris" : "Ajouter aux favoris", f: () => toggleLike(t.id) },
    {
      l: "Ajouter à une playlist…",
      f: () => openMenu([
        ...mine.map(p => ({ l: p.name, f: () => addToPlaylist(p.id, t.id) })),
        { l: "+ Nouvelle playlist", f: () => newPlaylist(t.id) }
      ], rect)
    }
  ];

  if (view === "col" && col && col.k === "my") {
    items.push({ l: "Retirer de cette playlist", f: () => removeFromPlaylist(col.uid, t.id) });
  }

  const ar = LIB.find(l => l.key === "ar:" + t.a);

  if (ar && !(view === "col" && col === ar)) {
    items.push({ l: "Aller à l'artiste", f: () => go("col", ar) });
  }

  openMenu(items, anchor);
}

function colMenu(anchor) {
  if (!col) return;

  const items = [
    { l: "Lire ensuite", f: () => enqueue(col.ids, true) },
    { l: "Ajouter à la file d'attente", f: () => enqueue(col.ids, false) }
  ];

  if (col.k === "my") {
    items.push({ l: "Renommer", f: () => renamePlaylist(col.uid) });
    items.push({ l: "Supprimer la playlist", danger: true, f: () => deletePlaylist(col.uid) });
  }

  openMenu(items, anchor);
}

function ask(title, def = "") {
  const d = $("#dlg");

  if (!d.showModal) return Promise.resolve((prompt(title, def) || "").trim() || null);

  return new Promise(res => {
    d.innerHTML = `
      <form method="dialog">
        <h2>${esc(title)}</h2>
        <input name="v" value="${esc(def)}" maxlength="60" autocomplete="off" aria-label="${esc(title)}">
        <div class="dact">
          <button class="pill on" value="ok">OK</button>
          <button class="pill" value="cancel" formnovalidate>Annuler</button>
        </div>
      </form>`;

    const inp = d.querySelector("input");

    d.returnValue = "";
    d.onclose = () => res(d.returnValue === "ok" ? (inp.value.trim() || null) : null);
    d.showModal();
    inp.select();
  });
}

function showHelp() {
  const d = $("#dlg");

  if (!d.showModal) return;

  const K = [
    ["Espace / K", "Lecture / pause"],
    ["N · P  (ou Maj + → ←)", "Suivant · précédent"],
    ["← →", "Reculer · avancer de 5 s"],
    ["↑ ↓", "Volume"],
    ["M", "Couper le son"],
    ["S · R", "Aléatoire · répéter"],
    ["L", "Ajouter aux favoris"],
    ["Q", "File d'attente"],
    ["F", "En cours de lecture (plein écran)"],
    ["/", "Rechercher"],
    ["Échap", "Fermer"]
  ];

  d.innerHTML = `
    <form method="dialog">
      <h2>Raccourcis clavier</h2>
      <ul>${K.map(([k, v]) => `<li><span>${esc(v)}</span><kbd>${esc(k)}</kbd></li>`).join("")}</ul>
      <div class="dact"><button class="pill on" value="ok">Fermer</button></div>
    </form>`;

  d.onclose = null;
  d.showModal();
}

let toastT;

function toast(msg) {
  const t = $("#toast");

  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Minuteur de sommeil ---------- */

let sleepT = null;
let sleepI = null;
let sleepAt = 0;
let sleepEOT = false;

function fireSleep() {
  clearTimeout(sleepT);
  clearInterval(sleepI);
  sleepAt = 0;
  setPlay(false);
  toast("Minuteur de sommeil : lecture arrêtée");
}

function setSleep(m) {
  clearTimeout(sleepT);
  clearInterval(sleepI);
  sleepAt = 0;
  sleepEOT = false;

  if (m === "eot") {
    sleepEOT = true;
    toast("Arrêt à la fin du titre");
  } else if (m) {
    sleepAt = Date.now() + m * 60000;
    sleepT = setTimeout(fireSleep, m * 60000);
    sleepI = setInterval(() => {
      if (sleepAt && Date.now() >= sleepAt) fireSleep();
      sleepUi();
    }, 20000);
    toast(`Arrêt dans ${m < 60 ? m + " min" : "1 heure"}`);
  }

  sleepUi();
}

function sleepLabel() {
  if (sleepEOT) return "fin du titre";
  if (sleepAt) return Math.max(1, Math.ceil((sleepAt - Date.now()) / 60000)) + " min";
  return "";
}

function sleepUi() {
  const on = !!(sleepAt || sleepEOT);
  const l = sleepLabel();

  $$("[data-act=sleep]").forEach(b => {
    b.classList.toggle("on", on);
    b.title = on ? `Minuteur de sommeil : ${l}` : "Minuteur de sommeil";
    b.setAttribute("aria-label", b.title);
  });

  const i = $("#sleepInfo");

  if (i) i.textContent = on ? `Arrêt : ${l}` : "";
}

function sleepMenu(anchor) {
  const items = [
    { l: "15 minutes", f: () => setSleep(15) },
    { l: "30 minutes", f: () => setSleep(30) },
    { l: "45 minutes", f: () => setSleep(45) },
    { l: "1 heure", f: () => setSleep(60) },
    { l: "À la fin du titre", f: () => setSleep("eot") }
  ];

  if (sleepAt || sleepEOT) items.unshift({ l: "Désactiver le minuteur", f: () => { setSleep(null); toast("Minuteur désactivé"); } });

  openMenu(items, anchor);
}

/* ---------- En cours de lecture (plein écran) ---------- */

const INERT = [".side", ".main", "#now", ".bar", ".tabs"];
let npReturn = null;

function openNp() {
  if (!T()) return;

  npReturn = document.activeElement;
  $("#np").hidden = false;
  document.body.classList.add("np-open");
  INERT.forEach(s => { const e = $(s); if (e) e.inert = true; });
  $("#np [data-act=npclose]").focus();
}

function closeNp() {
  if ($("#np").hidden) return;

  $("#np").hidden = true;
  document.body.classList.remove("np-open");
  INERT.forEach(s => { const e = $(s); if (e) e.inert = false; });

  if (npReturn && document.contains(npReturn)) npReturn.focus();
}

/* ---------- Actions ---------- */

function act(name, el) {
  switch (name) {
    case "pp": return setPlay(!playing);
    case "next": return step(1);
    case "prev": return prev();
    case "shuf": setShuffle(!shuffle); return renderChrome();
    case "rep": rep = (rep + 1) % 3; savePrefs(); return renderChrome();
    case "like": return T() && toggleLike(T().id);
    case "mute": return toggleMute();
    case "np": return openNp();
    case "npclose": return closeNp();
    case "queue": closeNp(); return go("queue");
    case "sleep": return sleepMenu(el);
    case "newpl": return newPlaylist();
    case "playcol": return col && playList(col.ids);
    case "shufcol": return col && playList(col.ids, true);
    case "playlist": return playList(ctxIds);
    case "shuflist": return playList(ctxIds, true);
    case "colmenu": return colMenu(el);
    case "clearhist": hist = []; saveHist(); renderLib(); return renderView();
    case "clearq":
      Q.splice(qi + 1, qNext);
      qNext = 0;
      saveState();
      return renderChrome();
  }
}

function queueAction(kind, pos) {
  if (kind === "rm") {
    removeFromQueue(pos);
    return focusQa("rm", Math.min(pos, Q.length - 1));
  }

  const to = kind === "up" ? pos - 1 : pos + 1;

  if (moveInQueue(pos, to)) focusQa(kind, to);
}

function focusQa(kind, pos) {
  const b = $(`[data-qa="${kind}"][data-pos="${pos}"]`) || $(`[data-qa][data-pos="${pos}"]`);

  if (b) b.focus();
}

document.addEventListener("click", e => {
  const mi = e.target.closest("[data-mi]");

  if (mi) {
    const it = menuItems[+mi.dataset.mi];

    closeMenu(false);

    if (it) it.f();

    return;
  }

  if (!$("#menu").hidden) closeMenu(false);

  const a = e.target.closest("[data-act]");

  if (a) return act(a.dataset.act, a);

  const lk = e.target.closest("[data-like]");

  if (lk) return toggleLike(lk.dataset.like);

  const mn = e.target.closest("[data-menu]");

  if (mn) return trackMenu(+mn.dataset.menu, mn);

  const qj = e.target.closest("[data-qi]");

  if (qj) return jumpTo(+qj.dataset.qi);

  const qa = e.target.closest("[data-qa]");

  if (qa) return queueAction(qa.dataset.qa, +qa.dataset.pos);

  const c = e.target.closest("[data-col]");

  if (c) {
    const l = LIB.find(x => x.key === c.dataset.col);

    if (l) go("col", l);

    return;
  }

  const n = e.target.closest("[data-nav]");

  if (n) return go(n.dataset.nav);

  if (e.target.closest("#backPlaylists")) {
    return prevNav ? go(prevNav.v, prevNav.c) : go("home");
  }

  const p = e.target.closest("[data-play]");

  if (p) {
    const i = Number(p.dataset.play);
    const k = ctxIds.indexOf(i);

    return k >= 0 ? startQueue(ctxIds, k) : startQueue([i]);
  }

  const pi = e.target.closest(".pill[data-k]");

  if (pi) {
    filter = pi.dataset.k;

    $$(".pill[data-k]").forEach(x => x.classList.toggle("on", x.dataset.k === filter));

    renderLib();

    if (view === "lib") renderView();
  }
});

/* Glisser-déposer dans la file (ordinateur) ; sur mobile, les boutons ▲ ▼ servent à réorganiser */

let dragPos = null;

document.addEventListener("dragstart", e => {
  const r = e.target.closest && e.target.closest(".tr.q[data-pos]");

  if (!r) return;

  dragPos = +r.dataset.pos;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(dragPos));
});

document.addEventListener("dragover", e => {
  const r = e.target.closest && e.target.closest(".tr.q[data-pos]");

  if (!r || dragPos === null) return;

  e.preventDefault();
  $$(".tr.q.over").forEach(x => x !== r && x.classList.remove("over"));
  r.classList.add("over");
});

document.addEventListener("drop", e => {
  const r = e.target.closest && e.target.closest(".tr.q[data-pos]");

  if (!r || dragPos === null) return;

  e.preventDefault();
  moveInQueue(dragPos, +r.dataset.pos);
  dragPos = null;
});

document.addEventListener("dragend", () => {
  dragPos = null;
  $$(".tr.q.over").forEach(x => x.classList.remove("over"));
});

/* ---------- Curseurs ---------- */

$$(".sk").forEach(s => {
  s.oninput = e => {
    seeking = true;
    cur = +e.target.value;
    $$(".tc").forEach(x => x.textContent = fmt(cur));
  };

  s.onchange = e => {
    seekTo(+e.target.value);
    seeking = false;
  };
});

$$(".vl").forEach(s => {
  s.oninput = e => setVol(+e.target.value);
});

$("#q").oninput = e => {
  term = e.target.value;

  if (view !== "search") go("search");
  else renderView();
};

/* ---------- Raccourcis clavier ---------- */

document.addEventListener("keydown", e => {
  const m = $("#menu");

  if (!m.hidden) {
    const bs = [...m.querySelectorAll("button")];
    const k = bs.indexOf(document.activeElement);

    if (e.key === "Escape") { e.preventDefault(); return closeMenu(true); }
    if (e.key === "ArrowDown") { e.preventDefault(); return bs[(k + 1) % bs.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); return bs[(k - 1 + bs.length) % bs.length].focus(); }
    if (e.key === "Tab") return closeMenu(false);

    return;
  }

  if ($("#dlg").open) return;

  const el = e.target;
  const typing = el.matches && el.matches("input:not([type=range]), textarea, select, [contenteditable]");

  if (typing) {
    if (e.key === "Escape" && el.id === "q") el.blur();
    return;
  }

  if (e.key === "Escape") {
    if (!$("#np").hidden) closeNp();
    return;
  }

  /* Entrée sur une ligne de titre */
  if (e.key === "Enter" && el.classList && el.classList.contains("tr")) {
    return el.click();
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const onRange = el.matches && el.matches("input[type=range]");
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  switch (key) {
    case " ":
    case "k":
      e.preventDefault();
      setPlay(!playing);
      break;

    case "ArrowRight":
      if (onRange) return;
      e.preventDefault();
      e.shiftKey ? step(1) : seekTo(cur + 5);
      break;

    case "ArrowLeft":
      if (onRange) return;
      e.preventDefault();
      e.shiftKey ? prev() : seekTo(cur - 5);
      break;

    case "ArrowUp":
      if (onRange) return;
      e.preventDefault();
      setVol((muted ? 0 : vol) + .05);
      break;

    case "ArrowDown":
      if (onRange) return;
      e.preventDefault();
      setVol((muted ? 0 : vol) - .05);
      break;

    case "n": step(1); break;
    case "p": prev(); break;
    case "m": toggleMute(); break;
    case "s": setShuffle(!shuffle); renderChrome(); break;
    case "r": rep = (rep + 1) % 3; savePrefs(); renderChrome(); break;
    case "l": if (T()) toggleLike(T().id); break;
    case "q": go("queue"); break;
    case "f": $("#np").hidden ? openNp() : closeNp(); break;
    case "/": e.preventDefault(); go("search"); $("#q").focus(); break;
    case "?": showHelp(); break;
  }
});

/* La barre d'espace active aussi les boutons au relâchement : on l'en empêche */
document.addEventListener("keyup", e => {
  if (e.key !== " ") return;

  const el = e.target;

  if (el.matches && el.matches("input:not([type=range]), textarea, select, [contenteditable]")) return;
  if (!$("#menu").hidden || $("#dlg").open) return;

  e.preventDefault();
});

/* ---------- Sauvegarde ---------- */

document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveState();
  else if (sleepAt && Date.now() >= sleepAt) fireSleep();
});

addEventListener("pagehide", saveState);

/* ---------- Démarrage ---------- */

$$("[data-ic]").forEach(el => el.outerHTML = svg(el.dataset.ic));

(async () => {
  const got = (
    await Promise.all(
      DATA_FILES.map(f =>
        fetch(f)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    )
  ).filter(Boolean);

  build(got.length ? got : [DEMO]);

  /* Reprise de la dernière session : file, titre et position */
  Q = TR.map((_, i) => i);
  ctx = Q.slice();
  qi = 0;
  qNext = 0;

  let at = 0;
  const s = ls.get("hw-state", null);

  if (s && Array.isArray(s.q)) {
    const q = [];
    let hit = -1;
    let before = 0;

    s.q.forEach((id, k) => {
      const i = ID.get(id);

      if (i === undefined) return;
      if (k === s.qi) hit = q.length;
      if (k < s.qi) before++;

      q.push(i);
    });

    if (q.length) {
      Q = q;
      qi = hit >= 0 ? hit : Math.min(before, q.length - 1);
      ctx = validArr(s.ctx).map(id => ID.get(id)).filter(i => i !== undefined);
      if (!ctx.length) ctx = Q.slice();
      qNext = clamp(Math.floor(+s.qNext) || 0, 0, Q.length - 1 - qi);
      at = hit >= 0 ? Math.max(0, +s.pos || 0) : 0;
    }
  }

  applyVol();
  renderLib();
  renderView();
  load(false, Math.min(at, TR[Q[qi]].d || at));
})();
