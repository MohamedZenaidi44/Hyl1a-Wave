/* Hyl1a Wave — lit data/local.json et data/youtube.json (s'ils existent).
   Sans données, une petite démo s'affiche. */
const DEMO={tracks:[{id:"d1",t:"Nuit Étoilée",a:"Aïsha K.",al:"Sessions",d:227},{id:"d2",t:"Horizon Bleu",a:"Karim D.",al:"Été Continu",d:242},{id:"d3",t:"Marée Haute",a:"Léa Or.",al:"Salt",d:178}],playlists:[{name:"Démo",tracks:["d1","d2","d3"]}]};
const DATA_FILES=["data/local.json","data/youtube.json"];

const IC={home:"M12 3 3 10v11h6v-7h6v7h6V10z",search:"M10 2a8 8 0 1 0 5 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z",play:"M8 5v14l11-7z",pause:"M6 5h4v14H6zm8 0h4v14h-4z",prev:"M6 6h2v12H6zm3.5 6 8.5 6V6z",next:"M16 6h2v12h-2zM6 18l8.5-6L6 6z",shuffle:"M16 3h5v5l-1.8-1.8L5.4 20 4 18.6 17.8 4.8zM4 5.4 5.4 4l5.4 5.4-1.4 1.4zm10.5 8.5 1.4-1.4 3.3 3.3L21 14v5h-5l1.8-1.8z",repeat:"M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z",heart:"M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z",vol:"M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"};
const svg=n=>`<svg viewBox="0 0 24 24"><path d="${IC[n]}"/></svg>`;
const $=s=>document.querySelector(s),fmt=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
const esc=s=>String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const grad=s=>{const h=[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7)%360;return[`hsl(${h} 70% 50%)`,`hsl(${(h+50)%360} 70% 32%)`]};
const cvStyle=o=>`--a:${o.c[0]};--b:${o.c[1]}${o.th?`;background:url('${o.th}') center/cover`:""}`;
const cv=o=>`<div class="cv" style="${cvStyle(o)}">${o.th?"":o.l}</div>`;

let TR=[],PL=[],LIB=[],Q=[],qi=0,playing=false,cur=0,shuffle=false,rep=0,view="home",filter="all",term="";
let liked=new Set();try{liked=new Set(JSON.parse(localStorage.getItem("hw-liked")||"[]"))}catch(e){}
const saveLiked=()=>{try{localStorage.setItem("hw-liked",JSON.stringify([...liked]))}catch(e){}};
const T=()=>TR[Q[qi]];

/* ---------- Données ---------- */
function build(list){
 TR=[];const pls=[];
 list.forEach(d=>{(d.tracks||[]).forEach(t=>{t.c=grad(t.t);t.l=t.t[0];if(!t.th&&t.yt)t.th=`https://i.ytimg.com/vi/${t.yt}/mqdefault.jpg`;TR.push(t)});pls.push(...(d.playlists||[]))});
 const idx=id=>TR.findIndex(t=>t.id===id);
 PL=pls.map(p=>{const ids=p.tracks.map(idx).filter(i=>i>=0);return{k:"pl",n:p.name,ids,s:"Playlist · "+ids.length+" titres",c:grad(p.name),l:p.name[0],th:TR[ids[0]]&&TR[ids[0]].th}}).filter(p=>p.ids.length);
 const grp=(k,key,label)=>[...new Set(TR.map(t=>t[key]).filter(Boolean))].map(n=>{const ids=TR.map((t,i)=>t[key]===n?i:-1).filter(i=>i>=0);return{k,n,ids,s:label,c:grad(n),l:n[0],th:TR[ids[0]].th}});
 LIB=[...PL,...grp("ar","a","Artiste"),...grp("al","al","Album")];
 Q=TR.map((_,i)=>i);qi=0}

/* ---------- Lecteurs : fichier audio + YouTube ---------- */
const au=new Audio();au.volume=.7;au.onended=()=>step(1,true);
let tick,yp=null,ypReady=false,ypLoading=false,loadedYt=null,pendingYt=null,errs=0;
function ytInit(){if(ypLoading)return;ypLoading=true;
 const mk=()=>{yp=new YT.Player("ytp",{width:"100%",height:"100%",playerVars:{playsinline:1,rel:0},events:{
  onReady(){ypReady=true;yp.setVolume(au.volume*100);if(pendingYt){loadedYt=pendingYt;yp.loadVideoById(pendingYt);pendingYt=null}},
  onStateChange(e){if(e.data===1)errs=0;if(e.data===0)step(1,true)},
  onError(){if(++errs>=Q.length)return setPlay(false);step(1,true)}}})};
 if(window.YT&&YT.Player)return mk();
 window.onYouTubeIframeAPIReady=mk;const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";document.head.appendChild(s)}
function startYt(id){if(!ypReady){pendingYt=id;return}if(loadedYt!==id){loadedYt=id;yp.loadVideoById(id)}else yp.playVideo()}

function startQueue(list,first=0){Q=list.slice();qi=Math.max(0,Math.min(first,Q.length-1));load(true)}
function load(play){const t=T();cur=0;au.pause();pendingYt=null;loadedYt=null;
 if(ypReady&&!t.yt)yp.pauseVideo();
 $("#yt").classList.toggle("show",!!t.yt);if(t.yt)ytInit();
 if(t.src)au.src=t.src;else au.removeAttribute("src");
 $("#bT").textContent=t.t;$("#bA").textContent=t.a||"";$("#bCv").style.cssText=cvStyle(t)+";width:56px;height:56px";$("#bCv").textContent=t.th?"":t.l;
 $("#sk").max=t.d;$("#sk").value=0;$("#tc").textContent="0:00";$("#td").textContent=fmt(t.d);setPlay(play)}
function setPlay(p){playing=p;$("#pp").innerHTML=svg(p?"pause":"play");clearInterval(tick);const t=T();
 if(p){if(t.yt){au.pause();startYt(t.yt)}else if(t.src)au.play().catch(()=>{});
  tick=setInterval(()=>{const T0=T();cur=T0.yt?(ypReady&&yp.getCurrentTime?yp.getCurrentTime():cur):T0.src&&au.currentTime?au.currentTime:cur+.25;
   if(!T0.yt&&!T0.src&&cur>=T0.d)return step(1,true);$("#sk").value=cur;$("#tc").textContent=fmt(cur)},250)}
 else{au.pause();if(ypReady)yp.pauseVideo()}
 render()}
function step(dir,auto){if(auto&&rep===2){loadedYt=null;return load(true)}
 if(shuffle&&dir>0)qi=Math.floor(Math.random()*Q.length);else{qi+=dir;if(qi>=Q.length){if(rep===1||!auto)qi=0;else return setPlay(false)}if(qi<0)qi=Q.length-1}load(true)}

/* ---------- Rendu ---------- */
function trk(i,n,list){const t=TR[i],on=Q[qi]===i;return `<button class="tr ${on?"on":""}" data-play="${i}" data-list="${list}"><span class="n">${on&&playing?"♪":n}</span><span class="t">${cv(t)}<span style="min-width:0"><b>${esc(t.t)}</b><small>${esc(t.a||"")}</small></span></span><span class="al d">${esc(t.al||"")}</span><span class="d">${fmt(t.d)}</span></button>`}
function render(){
 const h=new Date().getHours(),g=h<5||h>=18?"Bonsoir":"Bonjour",all=TR.map((_,i)=>i).join();let html="";
 if(view==="search"){const r=TR.map((_,i)=>i).filter(i=>(TR[i].t+(TR[i].a||"")+(TR[i].al||"")).toLowerCase().includes(term.toLowerCase()));
  html=`<h1>${term?"Résultats":"Tous les titres"}</h1>`+(r.length?r.map((i,n)=>trk(i,n+1,r.join())).join(""):`<p class="empty">Aucun titre pour « ${esc(term)} ». Essaie un autre mot.</p>`)}
 else html=`<h1>${g}</h1>${PL.length?`<div class="quick">${PL.slice(0,6).map((p,x)=>`<button class="qt" data-lib="${LIB.indexOf(p)}">${cv(p)}${esc(p.n)}</button>`).join("")}</div>`:""}
  <h2>Reprendre</h2><div class="cards">${TR.slice(0,6).map((t,i)=>`<button class="card" data-play="${i}" data-list="${all}">${cv(t)}<b>${esc(t.t)}</b><small>${esc(t.a||"")}</small></button>`).join("")}</div>
  <h2>Tous les titres</h2>${TR.map((_,i)=>trk(i,i+1,all)).join("")}`;
 $("#view").innerHTML=html;
 $("#lib").innerHTML=LIB.filter(l=>filter==="all"||l.k===filter).map(l=>`<button class="li" data-lib="${LIB.indexOf(l)}">${cv(l)}<span><b>${esc(l.n)}</b><small>${l.s}</small></span></button>`).join("");
 const t=T(),nx=Q.slice(qi+1,qi+4);
 $("#now").innerHTML=`${cv(t)}<div><h3>${esc(t.t)}</h3><small style="color:var(--mu)">${esc([t.a,t.al].filter(Boolean).join(" · "))}</small></div>${nx.length?`<div class="q">À suivre</div>`+nx.map(i=>`<button class="li" data-play="${i}" data-list="${Q.join()}">${cv(TR[i])}<span><b>${esc(TR[i].t)}</b><small>${esc(TR[i].a||"")}</small></span></button>`).join(""):""}`;
 $("#bLike").classList.toggle("on",liked.has(t.id));$("#shuf").classList.toggle("on",shuffle);$("#rep").classList.toggle("on",rep>0);$("#rep").title=["Répéter","Répéter la liste","Répéter le titre"][rep];
 $("#nHome").classList.toggle("on",view==="home");$("#nSearch").classList.toggle("on",view==="search")}

/* ---------- Événements ---------- */
document.addEventListener("click",e=>{
 const p=e.target.closest("[data-play]");if(p){const l=p.dataset.list.split(",").map(Number),i=+p.dataset.play;return startQueue(l,l.indexOf(i))}
 const li=e.target.closest("[data-lib]");if(li)return startQueue(LIB[+li.dataset.lib].ids);
 const pi=e.target.closest(".pill");if(pi){filter=pi.dataset.k;document.querySelectorAll(".pill").forEach(x=>x.classList.toggle("on",x===pi));render()}});
$("#pp").onclick=()=>setPlay(!playing);$("#next").onclick=()=>step(1);$("#prev").onclick=()=>{if(cur>3){loadedYt=null;load(playing)}else step(-1)};
$("#shuf").onclick=()=>{shuffle=!shuffle;render()};$("#rep").onclick=()=>{rep=(rep+1)%3;render()};
$("#bLike").onclick=()=>{const id=T().id;liked.has(id)?liked.delete(id):liked.add(id);saveLiked();render()};
$("#sk").oninput=e=>{cur=+e.target.value;const t=T();if(t.yt&&ypReady)yp.seekTo(cur,true);else if(t.src)au.currentTime=cur;$("#tc").textContent=fmt(cur)};
$("#vl").oninput=e=>{au.volume=+e.target.value;if(ypReady)yp.setVolume(au.volume*100)};
$("#nHome").onclick=()=>{view="home";render()};$("#nSearch").onclick=()=>{view="search";$("#q").focus();render()};
$("#q").oninput=e=>{term=e.target.value;view="search";render()};
document.querySelectorAll("[data-ic]").forEach(el=>el.outerHTML=svg(el.dataset.ic));
$("#pp").innerHTML=svg("play");

/* ---------- Démarrage ---------- */
(async()=>{
 const got=(await Promise.all(DATA_FILES.map(f=>fetch(f).then(r=>r.ok?r.json():null).catch(()=>null)))).filter(Boolean);
 build(got.length?got:[DEMO]);load(false)})();
