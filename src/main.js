
import { Stage, ARENAS, ARENA_IDS, THREE } from './scene.js';
import { FX, wait } from './fx.js';
import { Audio } from './audio.js';
import * as E from './engine.js';
const { MONSTERS, MONSTER_IDS, MOVES, ULTS, TYPE_INFO } = E;
const $ = s=>document.querySelector(s); const $$ = s=>[...document.querySelectorAll(s)];
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const store = { get:(k,d)=>{ try{ const v=localStorage.getItem('ff_'+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set:(k,v)=>{ try{ localStorage.setItem('ff_'+k, JSON.stringify(v)); }catch(e){} } };
const params = new URLSearchParams(location.search);
const quality = params.get('q') || store.get('quality', 'high');
const audio = new Audio();
let stage, fx, thumbs = {}, faceCanvas = null, battle = null;
const S = { photo: store.get('photo', null), name: store.get('name', ''), stats: store.get('stats', {xp:0,wins:0,losses:0}), team: store.get('team', ['blazimp','tidefang','zaptoad']), arena: store.get('arena','meadow'), share: store.get('share', true), diff: store.get('diff','normal') };

// ---------- helpers ----------
function show(id){ $$('.screen').forEach(s=>s.classList.toggle('show', s.id===id)); $('#hud').classList.toggle('show', id==='hud'); S.screen=id; }
function toast(t, ms=2600){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'), ms); }
function typeChip(t){ const i=TYPE_INFO[t]; return `<span class="chip" style="background:${i.color}">${i.label}</span>`; }
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function level(xp){ return Math.floor(Math.sqrt(xp/100))+1; }
function flashScreen(color, a=0.6){ const f=$('#flash'); f.style.background=color; f.style.transition='none'; f.style.opacity=a; requestAnimationFrame(()=>{ f.style.transition='opacity .6s'; f.style.opacity=0; }); }
document.addEventListener('pointerdown', ()=>audio.unlock(), {capture:true});
document.addEventListener('click', e=>{ if(e.target.closest('button,.btn,.card,.mbtn')) audio.click(); }, {capture:true});

// ---------- face ----------
function buildFaceCanvas(dataUrl){
  return new Promise(res=>{ if(!dataUrl) return res(null); const img=new Image(); img.onload=()=>{
    const N=512, c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d');
    g.save(); g.beginPath(); g.arc(N/2,N/2,N/2-6,0,Math.PI*2); g.clip(); g.drawImage(img,0,0,N,N);
    // soft edge
    const gr=g.createRadialGradient(N/2,N/2,N*0.36,N/2,N/2,N/2-6); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,0.35)'); g.fillStyle=gr; g.fillRect(0,0,N,N); g.restore();
    g.beginPath(); g.arc(N/2,N/2,N/2-10,0,Math.PI*2); g.lineWidth=10; g.strokeStyle='rgba(255,255,255,0.9)'; g.stroke();
    res(c); }; img.onerror=()=>res(null); img.src=dataUrl; });
}
async function refreshFace(){ faceCanvas = await buildFaceCanvas(S.photo); updateTrainer(); if(menuMon) stage.setFace(menuMon, faceCanvas); }

// ---------- boot ----------
async function boot(){
  try{
    stage = new Stage($('#c'), quality);
  }catch(e){ $('#loadtxt').textContent = 'Your browser could not start 3D graphics (WebGL). Try Chrome.'; return; }
  stage.flashScreen = flashScreen;
  fx = new FX(stage, audio);
  const bar=$('#loadbar'); let done=0; const total=MONSTER_IDS.length+1;
  const tick=()=>{ done++; bar.style.width=(done/total*100)+'%'; };
  await stage.loadArena(S.arena).then(tick);
  await Promise.all(MONSTER_IDS.map(id=>stage.loadModel(MONSTERS[id].model).then(tick)));
  $('#loadtxt').textContent='Almost ready…';
  for(const id of MONSTER_IDS) thumbs[id] = stage.snapshot(id, 256);
  faceCanvas = await buildFaceCanvas(S.photo);
  setupUI();
  enterMenu();
  window.__ready = true;
  const room = params.get('room');
  if(room){ $('#codeInput').value = room.toUpperCase().slice(0,5); show('join'); setTimeout(()=>$('#btnJoinNext').click(), 50); }
}

// ---------- menu scene ----------
let menuMon = null, menuOrbit = 0;
function clearArena(){ if(menuMon){ menuMon.dispose(); menuMon=null; } }
function enterMenu(){
  if(battle){ battle.destroy(); battle=null; }
  show('home'); audio.music('menu'); updateTrainer();
  showMenuMonster(S.team[0]);
}
function showMenuMonster(id, withFace=true){
  clearArena();
  menuMon = stage.createMonster(id, withFace?faceCanvas:null); stage.scene.add(menuMon.holder);
  menuMon.holder.position.set(0,0,0); menuMon.holder.rotation.y = 0;
  fx.summon(menuMon, MONSTERS[id].type);
  setMenuCam();
}
function setMenuCam(){
  const por = stage.portrait;
  // monster sits in the upper part of the screen behind the menu
  stage.camTarget = por ? { pos:V(1.2,2.2,7.6), look:V(0,0.15,0) } : { pos:V(2.6,1.6,6.6), look:V(-1.6,1.15,0) };
  if(S.screen==='team') stage.camTarget = por ? { pos:V(0.6,2.0,7.4), look:V(0,-0.7,0) } : { pos:V(2.4,1.5,6.0), look:V(-1.5,1.0,0) };
  if(S.screen==='photo'||S.screen==='lobby'||S.screen==='join') stage.camTarget = por ? { pos:V(0.8,2.6,9.5), look:V(0,2.6,0) } : { pos:V(2.6,1.7,7), look:V(-1.8,1.1,0) };
}
stage && (stage.onResize = ()=>{ if(!battle) setMenuCam(); else battle.layout(); });

// ---------- UI wiring ----------
function updateTrainer(){
  const av = $('#homeAvatar'); av.style.backgroundImage = `url(${S.photo || thumbs[S.team[0]]})`;
  $('#nameInput').value = S.name; const lv=level(S.stats.xp); $('#tLevel').textContent = `Lv ${lv}`; $('#tWins').textContent = `${S.stats.wins} win${S.stats.wins===1?'':'s'} · ${S.stats.losses} loss${S.stats.losses===1?'':'es'}`;
  const a=(lv-1)*(lv-1)*100, b=lv*lv*100; $('#tXp').style.width = Math.round((S.stats.xp-a)/(b-a)*100)+'%';
}
let teamMode = 'cpu', joinCode = null;
function setupUI(){
  stage.onResize = ()=>{ if(!battle) setMenuCam(); else battle.layout(); };
  $('#nameInput').addEventListener('input', e=>{ S.name=e.target.value.trim().slice(0,14); store.set('name',S.name); });
  $$('[data-back]').forEach(b=>b.onclick=()=>{ if(S.screen==='team' && teamMode==='join') { show('join'); setMenuCam(); return; } show('home'); showMenuMonster(S.team[0]); setMenuCam(); });
  $('#btnCpu').onclick=()=>openTeam('cpu');
  $('#btnQuick').onclick=()=>openTeam('quick');
  $$('#diffSeg button').forEach(b=>b.onclick=()=>{ S.diff=b.dataset.d; store.set('diff',S.diff); renderTeam(); });
  $('#btnHost').onclick=()=>openTeam('host');
  $('#btnJoin').onclick=()=>{ show('join'); $('#joinErr').textContent=''; setMenuCam(); setTimeout(()=>$('#codeInput').focus(),100); };
  $('#btnFace').onclick=()=>openPhoto();
  $('#homeAvatar').onclick=()=>openPhoto();
  $('#btnSettings').onclick=()=>openSettings();
  $('#btnHow').onclick=()=>{ buildHow(); show('howto'); };
  $('#btnCredits').onclick=e=>{ e.preventDefault(); show('credits'); };
  $('#codeInput').addEventListener('input', e=>{ e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''); });
  $('#btnJoinNext').onclick=async()=>{
    const c=$('#codeInput').value.trim().toUpperCase(); if(c.length<5){ $('#joinErr').textContent='The code has 5 letters/numbers.'; return; }
    $('#joinErr').textContent='Checking…';
    try{ const r=await fetch(`api/peek?code=${c}`); const j=await r.json(); if(!j.exists){ $('#joinErr').textContent='Room not found. Check the code.'; return; } if(j.full){ $('#joinErr').textContent='That room is already full.'; return; } }catch(e){ $('#joinErr').textContent='No internet connection?'; return; }
    $('#joinErr').textContent=''; joinCode=c; openTeam('join');
  };
  const inApp = /FaceFangApp|VPSmonApp/.test(navigator.userAgent);
  if(isMobile && !inApp){} else { $('#apkLink').parentElement.style.display = inApp ? 'none' : ''; }
  setupPhoto(); setupTeam(); setupHud(); setupSettings();
  window.addEventListener('popstate', ()=>{});
}

// ---------- photo editor ----------
const crop = { img:null, x:0, y:0, s:1, rot:0 };
function openPhoto(){ show('photo'); setMenuCam(); drawCrop(); if(S.photo && !crop.img){ const im=new Image(); im.onload=()=>{ crop.img=im; fitCrop(); }; im.src=S.photo; } }
function fitCrop(){ const im=crop.img; if(!im) return; crop.s=1; crop.x=0; crop.y=0; crop.rot=0; $('#zoom').value=1; drawCrop(); }
function drawCrop(){
  const c=$('#cropCanvas'), g=c.getContext('2d'); const W=c.width; g.fillStyle='#111a3a'; g.fillRect(0,0,W,W);
  $('#cropHint').style.display = crop.img ? 'none':'block';
  if(!crop.img) return; const im=crop.img;
  const base = W / Math.min(im.width, im.height);
  g.save(); g.translate(W/2+crop.x, W/2+crop.y); g.rotate(crop.rot*Math.PI/2); g.scale(base*crop.s, base*crop.s); g.drawImage(im, -im.width/2, -im.height/2); g.restore();
}
function loadFile(f){
  if(!f) return; const url=URL.createObjectURL(f); const im=new Image();
  im.onload=async()=>{ // downscale huge camera photos
    const m=1400, k=Math.min(1, m/Math.max(im.width,im.height)); const c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    const im2=new Image(); im2.onload=async()=>{ crop.img=im2; fitCrop(); await autoFace(im2); }; im2.src=c.toDataURL('image/jpeg',0.92); URL.revokeObjectURL(url); };
  im.onerror=()=>toast('Could not open that photo'); im.src=url;
}
async function autoFace(im){
  // Use the browser's built-in face detector when available (Chrome on Android); otherwise the user drags/zooms.
  try{ if(!('FaceDetector' in window)) return; const fd=new window.FaceDetector({fastMode:true, maxDetectedFaces:1}); const faces=await fd.detect(im); if(!faces.length) return;
    const b=faces[0].boundingBox; const W=$('#cropCanvas').width; const base=W/Math.min(im.width,im.height);
    const want = (W*0.62)/(Math.max(b.width,b.height)*1.25*base); crop.s=Math.max(1,Math.min(4,want)); $('#zoom').value=crop.s;
    const cx=b.x+b.width/2-im.width/2, cy=b.y+b.height/2-im.height/2; crop.x=-cx*base*crop.s; crop.y=-cy*base*crop.s; drawCrop(); toast('Face found ✓ adjust if needed');
  }catch(e){}
}
function setupPhoto(){
  $('#fileCam').onchange=e=>loadFile(e.target.files[0]); $('#fileGal').onchange=e=>loadFile(e.target.files[0]);
  $('#zoom').oninput=e=>{ crop.s=+e.target.value; drawCrop(); };
  $('#rot').onclick=()=>{ crop.rot=(crop.rot+1)%4; drawCrop(); };
  const wrap=$('.cropwrap'); const pts=new Map(); let last=null;
  wrap.addEventListener('pointerdown',e=>{ wrap.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); last=null; });
  wrap.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)||!crop.img) return; const p=pts.get(e.pointerId); const k=$('#cropCanvas').width/wrap.clientWidth;
    if(pts.size===1){ crop.x+=(e.clientX-p.x)*k; crop.y+=(e.clientY-p.y)*k; }
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){ const [a,b]=[...pts.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(last){ crop.s=Math.max(1,Math.min(4,crop.s*d/last)); $('#zoom').value=crop.s; } last=d; }
    drawCrop(); });
  const up=e=>{ pts.delete(e.pointerId); last=null; }; wrap.addEventListener('pointerup',up); wrap.addEventListener('pointercancel',up);
  wrap.addEventListener('wheel',e=>{ e.preventDefault(); crop.s=Math.max(1,Math.min(4,crop.s*(e.deltaY<0?1.08:0.92))); $('#zoom').value=crop.s; drawCrop(); },{passive:false});
  $('#faceSave').onclick=async()=>{
    if(!crop.img){ toast('Take a selfie or pick a photo first'); return; }
    const src=$('#cropCanvas'), W=src.width, R=W*0.42; const out=document.createElement('canvas'); out.width=out.height=256;
    out.getContext('2d').drawImage(src, W/2-R, W/2-R, R*2, R*2, 0, 0, 256, 256);
    S.photo = out.toDataURL('image/jpeg', 0.86); store.set('photo', S.photo); await refreshFace(); audio.select();
    toast('Face saved! It is on your monsters now 😄'); show('home'); setMenuCam();
  };
  $('#faceRemove').onclick=async()=>{ S.photo=null; store.set('photo',null); crop.img=null; drawCrop(); await refreshFace(); toast('Face removed'); };
}

// ---------- team select ----------
let picks = [], focusId = null, arenaPick = S.arena;
function openTeam(mode){
  teamMode = mode; picks = S.team.filter(t=>MONSTERS[t]).slice(0,3); focusId = picks[0] || MONSTER_IDS[0];
  $('#teamTitle').textContent = mode==='cpu' ? 'Pick 3 Monsters' : mode==='host' ? 'Your Team (Friend Battle)' : mode==='quick' ? 'Quick Match Team' : `Join room ${joinCode}`;
  $('#arenaRow').style.display = (mode==='join'||mode==='quick') ? 'none' : 'flex';
  $('#diffRow').style.display = mode==='cpu' ? 'flex' : 'none';
  show('team'); renderTeam(); showMenuMonster(focusId); setMenuCam();
}
function setupTeam(){
  $('#cards').innerHTML = MONSTER_IDS.map(id=>{ const m=MONSTERS[id]; return `<div class="card" data-id="${id}"><span class="ct" style="background:${TYPE_INFO[m.type].color};color:${TYPE_INFO[m.type].color}"></span><span class="num"></span><img src="${thumbs[id]}" alt=""><div class="cn">${m.name}</div></div>`; }).join('');
  $$('#cards .card').forEach(c=>c.onclick=()=>{
    const id=c.dataset.id;
    if(focusId!==id){ focusId=id; showMenuMonster(id); }
    if(picks.includes(id)) picks=picks.filter(x=>x!==id); else if(picks.length<3) picks.push(id); else { picks.shift(); picks.push(id); }
    renderTeam();
  });
  $('#arenaRow').innerHTML = ARENA_IDS.map(a=>`<button data-a="${a}" style="background-image:linear-gradient(transparent 30%,rgba(0,0,0,.6)),url(assets/arenas/${ARENAS[a].sky}-thumb.jpg)">${ARENAS[a].name}</button>`).join('');
  $$('#arenaRow button').forEach(b=>b.onclick=async()=>{ arenaPick=b.dataset.a; renderTeam(); await stage.loadArena(arenaPick); });
  $('#btnGo').onclick=startFromTeam;
}
function renderTeam(){
  const m=MONSTERS[focusId];
  $('#mInfo').innerHTML = `<div class="nm">${m.name} ${typeChip(m.type)}</div><div class="stats"><span>HP <b>${m.hp}</b></span><span>ATK <b>${m.atk}</b></span><span>DEF <b>${m.def}</b></span><span>SPD <b>${m.spd}</b></span></div>
    <div class="bl">${m.blurb} Strong vs ${E.strongAgainst(m.type).map(t=>TYPE_INFO[t].label).join(', ')} · Weak to ${E.weakAgainst(m.type).map(t=>TYPE_INFO[t].label).join(', ')}</div>
    <div class="mv">${m.moves.map(k=>{ const mv=MOVES[k]; return `<span style="border-color:${TYPE_INFO[mv.type].color}">${mv.name}${mv.power?` · ${mv.power}`:''}</span>`; }).join('')}<span style="border-color:#ff3df2">⚡ ${ULTS[m.type].name}</span></div>`;
  $$('#cards .card').forEach(c=>{ const i=picks.indexOf(c.dataset.id); c.classList.toggle('picked', i>=0); c.classList.toggle('focus', c.dataset.id===focusId); c.querySelector('.num').textContent = i>=0? i+1 : ''; });
  $('#slots').innerHTML = [0,1,2].map(i=>`<div class="slot ${picks[i]?'f':''}" style="${picks[i]?`background-image:url(${thumbs[picks[i]]})`:''}"></div>`).join('');
  $$('#arenaRow button').forEach(b=>b.classList.toggle('on', b.dataset.a===arenaPick));
  $$('#diffSeg button').forEach(b=>b.classList.toggle('on', b.dataset.d===S.diff));
  const go=$('#btnGo'); go.disabled = picks.length!==3; go.textContent = teamMode==='cpu' ? 'Battle!' : teamMode==='host' ? 'Create Room' : teamMode==='quick' ? 'Find Match' : 'Join Battle';
}
async function startFromTeam(){
  if(picks.length!==3) return; S.team=picks.slice(); store.set('team',S.team); S.arena=arenaPick; store.set('arena',S.arena);
  const name = S.name || 'You';
  if(teamMode==='cpu'){
    startBattle({ mode:'cpu', diff:S.diff, arena:arenaPick, mySide:0, names:[name,`CPU (${S.diff[0].toUpperCase()+S.diff.slice(1)})`], teams:[S.team,rivalTeam(S.team)], faces:[faceCanvas,null] });
    return;
  }
  if(teamMode==='quick'){ quickMatch(name); return; }
  const btn=$('#btnGo'); btn.disabled=true; btn.textContent='Connecting…';
  const photo = S.share ? S.photo : null;
  try{
    if(teamMode==='host'){
      const r=await fetch('api/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name, team:S.team, photo, arena:arenaPick})}); const j=await r.json();
      if(!r.ok) throw new Error(j.error||'Could not create room');
      openLobby(j);
    } else {
      const r=await fetch('api/join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:joinCode, name, team:S.team, photo})}); const j=await r.json();
      if(!r.ok) throw new Error(j.error||'Could not join');
      const net = new Net(j.code, j.token, j.seat); const v = await net.fetchState(); startOnline(net, v);
    }
  }catch(e){ toast(e.message||'Network problem'); renderTeam(); }
}

function rivalTeam(mine){ const rest=MONSTER_IDS.filter(x=>!mine.includes(x)).sort(()=>Math.random()-0.5); const all=rest.concat(mine.slice().sort(()=>Math.random()-0.5)); return all.slice(0,3); }
const BOT_NAMES=['Rohan','Kabir','Ishaan','Ananya','Meera','Arjun','Zoya','Vikram','Nikhil','Priya','Aarav','Sana','Dev','Tara','Yash','Riya','PixelPanda','ShadowKing','StormRider','NinjaChai','BlazeBoss','MasalaMonk'];
let quickState=null;
async function quickMatch(name){
  show('search'); setMenuCam(); $('#searchTxt').textContent='Looking for an online player…';
  const q = quickState = { cancelled:false, t0:performance.now() };
  const timer = setInterval(()=>{ $('#searchT').textContent = Math.floor((performance.now()-q.t0)/1000); }, 250);
  const done = ()=>{ clearInterval(timer); };
  $('#searchCancel').onclick = async()=>{ q.cancelled=true; done(); if(q.net){ q.net.stop(); await q.net.post('quick_cancel',{}); } enterMenu(); };
  let j;
  try{ const r=await fetch('api/quick',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name, team:S.team, photo:S.share?S.photo:null})}); j=await r.json(); if(!r.ok) throw new Error(j.error); }
  catch(e){ done(); if(q.cancelled) return; $('#searchTxt').textContent='Offline — starting a bot match…'; await wait(900); startBotMatch(name); return; }
  if(q.cancelled) return;
  const net = new Net(j.code, j.token, j.seat); q.net=net;
  if(j.matched){ done(); $('#searchTxt').textContent='Player found!'; const v=await net.fetchState(); startOnline(net, v); return; }
  net.onView = v=>{ if(v.status==='battle' && v.players[1] && !q.cancelled){ q.cancelled=true; done(); net.onView=null; $('#searchTxt').textContent='Player found!'; startOnline(net, v); } };
  net.start();
  const WAIT = 18000;
  while(performance.now()-q.t0 < WAIT){ await wait(250); if(q.cancelled) return; }
  const r = await net.post('quick_cancel',{});
  if(q.cancelled) return;
  if(r.cancelled){ q.cancelled=true; net.stop(); done(); $('#searchTxt').textContent='No one online right now — matching you with a bot…'; await wait(1100); startBotMatch(name); }
  else { // someone is joining right now; give it a moment
    $('#searchTxt').textContent='Player found! Connecting…';
    await wait(6000); if(!q.cancelled){ q.cancelled=true; net.stop(); done(); startBotMatch(name); }
  }
}
function startBotMatch(name){
  const bn = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)];
  const diff = Math.random()<0.55 ? 'normal' : 'hard';
  startBattle({ mode:'cpu', bot:true, diff, arena:ARENA_IDS[Math.floor(Math.random()*ARENA_IDS.length)], mySide:0, names:[name, bn], teams:[S.team, rivalTeam(S.team)], faces:[faceCanvas,null] });
}

// ---------- lobby ----------
let lobbyNet = null;
function openLobby(j){
  show('lobby'); setMenuCam(); $('#lobbyCode').textContent = j.code;
  const link = `${location.origin}${location.pathname}?room=${j.code}`;
  const msg = `Let's battle in VPSmon! 👊 Room code: ${j.code}\n${link}`;
  $('#shareWa').href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  $('#shareCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(msg); toast('Link copied ✓'); }catch(e){ toast(link, 5000); } };
  $('#shareMore').style.display = navigator.share ? '' : 'none';
  $('#shareMore').onclick=()=>navigator.share({title:'VPSmon', text:msg}).catch(()=>{});
  lobbyNet = new Net(j.code, j.token, j.seat);
  lobbyNet.onView = v=>{ if(v.status==='battle' && v.players[1]){ const n=lobbyNet; lobbyNet=null; n.onView=null; startOnline(n, v); } };
  lobbyNet.start();
  $('#lobbyCancel').onclick=()=>{ if(lobbyNet){ lobbyNet.leave(); lobbyNet.stop(); lobbyNet=null; } enterMenu(); };
}

// ---------- networking ----------
class Net {
  constructor(code, token, seat){ this.code=code; this.token=token; this.seat=seat; this.ver=0; this.running=false; this.fails=0; this.onView=null; this.lastView=null; }
  url(p, extra=''){ return `api/${p}?code=${this.code}&token=${this.token}${extra}`; }
  async fetchState(){ const r=await fetch(this.url('state',`&v=0`),{cache:'no-store'}); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Network error'); this.ver=j.ver; this.lastView=j; return j; }
  start(){ if(this.running) return; this.running=true; this.loop(); }
  stop(){ this.running=false; clearTimeout(this._t); }
  async loop(){
    if(!this.running) return;
    try{
      const r=await fetch(this.url('state',`&v=${this.ver}`),{cache:'no-store'}); const j=await r.json();
      if(r.ok){ this.fails=0; if(!j.same){ this.ver=j.ver; this.lastView=j; this.onView && this.onView(j); } else this.onPing && this.onPing(j); }
      else if(r.status===404||r.status===403){ this.onGone && this.onGone(j.error); this.stop(); return; }
    }catch(e){ this.fails++; if(this.fails===6) toast('Connection is weak… retrying'); }
    this._t=setTimeout(()=>this.loop(), document.hidden? 1500 : 450);
  }
  async post(p, body){ for(let i=0;i<3;i++){ try{ const r=await fetch(`api/${p}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:this.code, token:this.token, ...body})}); const j=await r.json(); return {ok:r.ok, status:r.status, ...j}; }catch(e){ await wait(400); } } return {ok:false,error:'network'}; }
  act(action, turn){ return this.post('act',{action, turn}); }
  emote(e){ return this.post('emote',{emote:e}); }
  rematch(){ return this.post('rematch',{}); }
  leave(){ try{ navigator.sendBeacon && navigator.sendBeacon('api/leave', new Blob([JSON.stringify({code:this.code, token:this.token})],{type:'application/json'})); }catch(e){ this.post('leave',{}); } }
  async photo(seat){ try{ const r=await fetch(this.url('photo',`&seat=${seat}`)); const j=await r.json(); return j.photo; }catch(e){ return null; } }
}
async function startOnline(net, v){
  const opp = 1-net.seat;
  const names = v.players.map(p=>p.name); const teams = v.players.map(p=>p.team);
  const faces = [null,null]; faces[net.seat] = S.share ? faceCanvas : null;
  startBattle({ mode:'online', net, arena:v.arena, mySide:net.seat, names, teams, faces, view:v });
  if(v.players[opp].hasPhoto){ const ph = await net.photo(opp); if(ph && battle && battle.net===net){ const fc = await buildFaceCanvas(ph); battle.setFace(opp, fc, ph); } }
}

// ---------- battle ----------
function startBattle(cfg){ clearArena(); if(battle) battle.destroy(); battle = new Battle(cfg); }
const EMOTES = ['Nice move! 👍','😂','😮','😡','GG 🤝','Oops 😅','🔥🔥','Watch this! 😎'];
class Battle {
  constructor(cfg){
    Object.assign(this, cfg); this.me=cfg.mySide; this.opp=1-cfg.mySide; this.mons=[null,null]; this.busy=false; this.auras=[null,null]; this.statusFx=[null,null];
    this.photos=[null,null]; if(this.faces[this.me]) this.photos[this.me]=S.photo;
    this.b = cfg.view ? JSON.parse(JSON.stringify(cfg.view.battle)) : E.createBattle(cfg.teams[0], cfg.teams[1], (Math.random()*4294967295)>>>0);
    this.shownTurn = this.b.turn; this.round = cfg.view? cfg.view.round : 1; this.lastEmote = cfg.view && cfg.view.emotes.length ? cfg.view.emotes[cfg.view.emotes.length-1].id : 0;
    show('hud'); audio.music('battle');
    $('#btnRematch').style.display='';
    this.init();
  }
  async init(){
    if(stage.arenaId!==this.arena) await stage.loadArena(this.arena);
    this.layout();
    for(const side of [0,1]) this.spawn(side, E.active(this.b, side).id, true);
    this.renderCards(); this.setPhase('intro');
    banner(`${this.names[this.opp]} wants to battle!`, 1600);
    await wait(1700);
    if(this.mode==='online'){ this.net.onView = v=>this.onView(v); this.net.onGone = (e)=>{ toast(e||'Room closed'); }; this.net.onPing = v=>this.tickTimer(v); this.net.start(); this.onView(this.net.lastView, true); }
    this.setPhase('choose');
    if(!store.get('tut',false)) this.tutorial();
  }
  setFace(side, fc, ph){ this.faces[side]=fc; this.photos[side]=ph; if(this.mons[side]) stage.setFace(this.mons[side], fc); this.renderCards(); }
  layout(){
    const por = stage.portrait;
    this.pos = por ? [V(-0.9,0,1.45), V(1.05,0,-1.7)] : [V(-2.3,0,0.85), V(2.3,0,-0.85)];
    const cam = por ? { pos:V(-0.15,2.85,9.8), look:V(0.05,0.2,0) } : { pos:V(0.0,2.6,9.6), look:V(0.4,0.95,0) };
    // my side is always the near spot
    this.spot = s => s===this.me ? this.pos[0] : this.pos[1];
    stage.camTarget = cam; this.cam = cam;
    for(const s of [0,1]) if(this.mons[s]) this.place(s);
  }
  place(side){
    const m=this.mons[side]; const p=this.spot(side), q=this.spot(1-side);
    m.holder.position.copy(p);
    const toFoe=Math.atan2(q.x-p.x, q.z-p.z), toCam=Math.atan2(this.cam.pos.x-p.x, this.cam.pos.z-p.z);
    let d=toCam-toFoe; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2;
    const yaw = toFoe + d*(side===this.me?0.72:0.5);
    m.holder.rotation.y = yaw; m.faceDir = V(Math.sin(toFoe),0,Math.cos(toFoe));
  }
  spawn(side, id, first){
    if(this.mons[side]){ this.mons[side].alive=false; this.mons[side].dispose(); }
    if(this.auras[side]){ this.auras[side](); this.auras[side]=null; } if(this.statusFx[side]){ this.statusFx[side](); this.statusFx[side]=null; }
    const m = stage.createMonster(id, this.faces[side]); stage.scene.add(m.holder); this.mons[side]=m; this.place(side);
    const f=E.active(this.b, side);
    if(f.surged){ m.inner.scale.setScalar(1.15); this.auras[side]=fx.aura(m, MONSTERS[id].type); }
    if(f.status) this.statusFx[side]=fx.statusLoop(m, f.status);
    m.inner.scale.multiplyScalar(0.01); const target=f.surged?1.15:1;
    fx.tween(0.45,k=>{ const e=1-Math.pow(1-k,3); m.inner.scale.setScalar(Math.max(0.01,target*(e+Math.sin(k*Math.PI)*0.12))); });
    m.play('Jump',{once:true,speed:1.2}); fx.summon(m, MONSTERS[id].type);
  }
  fighterHTML(side){
    const s=this.b.sides[side], f=E.active(this.b,side), m=MONSTERS[f.id]; const pct=Math.max(0,f.hp/f.maxhp*100);
    const st = f.status ? `<span class="st" style="background:${{burn:'#ff6a2b',paralyze:'#e6b800',sleep:'#7a86c8',freeze:'#4fc3f7',curse:'#8a4dff'}[f.status]}">${{burn:'BRN',paralyze:'PAR',sleep:'SLP',freeze:'FRZ',curse:'CRS'}[f.status]}</span>` : '';
    const av = this.photos[side] || thumbs[f.id];
    return `<div class="av" style="background-image:url(${av})"></div>
      <div class="nm">${m.name} ${typeChip(m.type)} ${st} <span class="tr">${esc(this.names[side]||'')}</span>${this.bot&&side===this.opp?'<span class="botchip">BOT</span>':''}</div>
      <div class="hp"><div class="trail" style="width:${pct}%"></div><div class="fill ${pct<25?'low':pct<50?'mid':''}" style="width:${pct}%"></div></div>
      <div class="sub"><span class="pips">${s.team.map(t=>`<i class="${t.hp<=0?'x':''}"></i>`).join('')}</span><span>${side===this.me?`${Math.max(0,f.hp)}/${f.maxhp}`:''}</span></div>
      ${side===this.me?`<div class="charge ${s.charge>=100?'full':''}"><i style="width:${s.charge}%"></i></div>`:''}`;
  }
  renderCards(){ $('#meCard').innerHTML=this.fighterHTML(this.me); $('#foeCard').innerHTML=this.fighterHTML(this.opp); this.renderMoves(); }
  setHp(side, hp, maxhp){
    const card = side===this.me? $('#meCard') : $('#foeCard'); const pct=Math.max(0,hp/maxhp*100);
    const fill=card.querySelector('.fill'), trail=card.querySelector('.trail'); if(!fill) return;
    fill.style.width=pct+'%'; fill.className='fill '+(pct<25?'low':pct<50?'mid':''); trail.style.width=pct+'%';
    if(side===this.me){ const sp=card.querySelector('.sub span:last-child'); if(sp) sp.textContent=`${Math.max(0,hp)}/${maxhp}`; }
  }
  renderMoves(){
    const f=E.active(this.b,this.me), m=MONSTERS[f.id], foe=MONSTERS[E.active(this.b,this.opp).id];
    $('#moves').innerHTML = m.moves.map((k,i)=>{ const mv=MOVES[k], col=TYPE_INFO[mv.type].color; const eff = mv.power? E.typeMult(mv.type, foe.type) : 1;
      return `<button class="mbtn" data-i="${i}" style="background:linear-gradient(160deg,${col},${shade(col,-45)})">${mv.name}${eff===2?'<span class="eff">SUPER</span>':eff===0.5?'<span class="eff">WEAK</span>':''}<small><span>${TYPE_INFO[mv.type].label}</span><span>${mv.power?`PWR ${mv.power} · ${mv.acc}%`:mv.desc}</span></small></button>`; }).join('');
    $$('#moves .mbtn').forEach(b=>b.onclick=()=>this.choose({type:'move',idx:+b.dataset.i}));
    const s=this.b.sides[this.me]; const u=$('#btnUlt'); u.disabled = s.charge<100; u.innerHTML = s.charge>=100 ? `⚡ ${ULTS[m.type].name}` : `⚡ ULTIMATE ${s.charge}%`;
    $('#btnSwitch').disabled = !s.team.some((t,i)=>i!==s.active && t.hp>0);
    $('#btnEmote').style.display = (this.mode==='online'||this.bot) ? '' : 'none';
  }
  setPhase(p){
    this.phase=p; const choose = p==='choose';
    $('#actions').style.display = choose ? 'flex' : 'none';
    $('#waitbox').classList.toggle('show', p==='waiting');
    if(p!=='choose') ['#switchSheet','#emoteSheet'].forEach(s=>$(s).classList.remove('show'));
  }
  async choose(action){
    if(this.phase!=='choose' || this.busy) return;
    $('#switchSheet').classList.remove('show');
    if(this.mode==='cpu'){
      if(this.bot){ this.setPhase('waiting'); $('#waitTxt').textContent=`${this.names[this.opp]} is choosing…`; $('#timer').textContent=''; await wait(500+Math.random()*1600); if(this.destroyed) return; }
      this.setPhase('anim'); const cpu = E.cpuAction(this.b, this.opp, Math.random, this.diff||'normal');
      const acts=[null,null]; acts[this.me]=action; acts[this.opp]=cpu;
      const before = JSON.parse(JSON.stringify(this.b));
      const ev = E.resolveTurn(this.b, acts);
      await this.play(ev, before); this.botChat(ev); this.afterTurn();
    } else {
      this.setPhase('waiting'); $('#waitTxt').textContent='Waiting for opponent…';
      const r = await this.net.act(action, this.b.turn);
      if(!r.ok && r.error!=='stale turn'){ toast(r.error||'Could not send move'); this.setPhase('choose'); }
    }
  }
  tickTimer(v){
    if(this.phase!=='waiting' || !v || !this.deadline) { $('#timer').textContent=''; return; }
    const left = Math.max(0, Math.round((this.deadline - v.now)/1000)); $('#timer').textContent = left<=30 ? left+'s' : '';
  }
  async onView(v, initial){
    if(!v || this.destroyed) return;
    this.deadline = v.deadline; this.tickTimer(v);
    const opp=v.players[this.opp];
    if(opp){ if(!opp.online && !this.offWarn){ this.offWarn=true; toast(`${this.names[this.opp]} seems offline…`, 3500); } if(opp.online) this.offWarn=false;
      if(this.phase==='waiting') $('#waitTxt').textContent = opp.left ? 'Opponent left the room' : 'Waiting for opponent…'; }
    // emotes
    for(const e of v.emotes||[]){ if(e.id>this.lastEmote){ this.lastEmote=e.id; if(e.seat!==this.me || initial) this.showEmote(e.seat, e.e); } }
    if(v.round > this.round){ // rematch started
      this.round=v.round; this.ended=false; stage.camOverride=null; this.b=JSON.parse(JSON.stringify(v.battle)); this.shownTurn=this.b.turn; show('hud'); confettiStop(); audio.music('battle');
      for(const side of [0,1]) this.spawn(side, E.active(this.b, side).id); this.renderCards(); banner('Rematch! Fight!',1500); this.setPhase('choose'); return;
    }
    if(this.queueing) { this.pendingView=v; return; }
    this.queueing=true;
    try{
      if(v.battle && v.battle.turn > this.shownTurn){
        const entries = (v.log||[]).filter(e=>e.turn>this.shownTurn).sort((a,b)=>a.turn-b.turn);
        if(entries.length && entries[0].turn===this.shownTurn+1){
          for(const en of entries){ this.setPhase('anim'); const before=JSON.parse(JSON.stringify(this.b)); await this.play(en.events, before); this.applyEvents(en.events); this.shownTurn=en.turn; }
        }
        this.b = JSON.parse(JSON.stringify(v.battle)); this.shownTurn=this.b.turn; this.syncScene();
        this.afterTurn(v);
      } else if(v.status==='over' && !this.ended && this.finishedRound!==this.round){
        // forfeit / leave
        const ent = (v.log||[]).find(e=>e.events.some(x=>x.t==='forfeit'));
        if(ent) await this.play(ent.events, this.b);
        this.b = JSON.parse(JSON.stringify(v.battle)); this.afterTurn(v);
      } else if(!initial && this.phase==='choose'){ /* nothing */ }
    } finally { this.queueing=false; }
    if(this.pendingView){ const pv=this.pendingView; this.pendingView=null; this.onView(pv); }
  }
  applyEvents(ev){ /* local mirror is replaced by the server battle after playback */ }
  syncScene(){ for(const side of [0,1]){ const f=E.active(this.b,side); if(!this.mons[side] || this.mons[side].id!==f.id || !this.mons[side].alive) this.spawn(side,f.id); } this.renderCards(); }
  afterTurn(v){
    if(this.b.winner!==null && this.b.winner!==undefined){ this.finish(this.b.winner, v); return; }
    this.renderCards(); this.setPhase('choose');
  }
  side(s){ return s===this.me ? 'Your' : 'Foe'; }
  label(s){ const f=E.active(this.b,s); return (s===this.me?'':'Foe ')+MONSTERS[f.id].name; }
  async play(events, before){
    // "before" is the battle state at the start of the turn; we walk the events to animate them
    this.busy=true; const st = before;
    const nm = s => (s===this.me?'':'Foe ')+MONSTERS[E.active(st,s).id].name;
    try{
    for(let i=0;i<events.length;i++){
      const e=events[i]; if(this.destroyed) return;
      switch(e.t){
        case 'move': {
          const att=this.mons[e.side], tgt=this.mons[1-e.side];
          banner(`${nm(e.side)} used ${e.name}!`, 1300, e.ult);
          if(e.ult){ flashScreen('#ffffff',0.35); }
          const next = events[i+1] && events[i+1].t==='surge' ? events[i+2] : events[i+1];
          if(next && next.t==='miss'){ // still animate the attack, but it whiffs
            await fx.attack(att,tgt,{...MOVES[e.move]||{}, ...e, mtype:e.mtype, fx:e.fx});
            tgt.play('Duck',{once:true,speed:1.3}); audio.miss(); dmgNum(tgt,'MISS','miss'); await wait(450); i++; break;
          }
          if(events[i+1] && events[i+1].t==='surge'){ const m=att; const f=E.active(st,e.side); f.surged=true; fx.tween(0.6,k=>m.inner.scale.setScalar(1+0.15*k)); if(!this.auras[e.side]) this.auras[e.side]=fx.aura(m, MONSTERS[f.id].type); }
          await fx.attack(att,tgt,{...e, mtype:e.mtype, fx:e.fx});
          break; }
        case 'surge': banner(`${nm(e.side)} SURGED with power!`,1100,true); break;
        case 'damage': {
          const tgt=this.mons[e.side]; const f=E.active(st,e.side); f.hp=e.hp;
          const prev = events.slice(0,i).reverse().find(x=>x.t==='move');
          fx.impact(tgt, prev?prev.mtype:'neutral', Math.min(1.5, e.amount/f.maxhp*3)+(prev&&prev.ult?0.8:0), e.crit);
          audio.hit(e.amount/f.maxhp, e.crit); hitFlash(tgt, prev?prev.mtype:'neutral'); knock(tgt, this.spot(1-e.side));
          tgt.play('HitReact',{once:true,speed:1.2});
          dmgNum(tgt, '-'+e.amount, e.crit?'crit':'');
          this.setHp(e.side, e.hp, e.maxhp);
          if(e.eff===2){ callout('Super effective!','#ffcc33'); audio.super_(); } else if(e.eff===0.5) callout('Not very effective…','#aab3d6');
          if(e.crit) setTimeout(()=>callout('Critical hit!','#ff5a5a'), e.eff!==1?500:0);
          // charge meters roughly follow (server state syncs later)
          await wait(e.eff!==1||e.crit?900:650); break; }
        case 'heal': { const m=this.mons[e.side]; E.active(st,e.side).hp=e.hp; this.setHp(e.side,e.hp,e.maxhp); dmgNum(m,'+'+e.amount,'heal'); await wait(500); break; }
        case 'stat': { const m=this.mons[e.side]; fx.statArrows(m, e.delta>0, MONSTERS[E.active(st,e.side).id].type); audio.chime(e.delta>0?1:0);
          banner(`${nm(e.side)}'s ${e.word} ${e.delta>1?'rose sharply!':e.delta>0?'rose!':e.delta<-1?'fell sharply!':'fell!'}`,1000); await wait(850); break; }
        case 'status': { const m=this.mons[e.side]; const f=E.active(st,e.side); f.status=e.status; fx.statusPuff(m,e.status);
          if(this.statusFx[e.side]) this.statusFx[e.side](); this.statusFx[e.side]=fx.statusLoop(m,e.status);
          banner(`${nm(e.side)} ${{burn:'was burned!',paralyze:'is paralyzed!',sleep:'fell asleep!',freeze:'was frozen solid!',curse:'was cursed!'}[e.status]}`,1100); this.renderCardsFrom(st); await wait(900); break; }
        case 'cure': { const f=E.active(st,e.side); f.status=null; if(this.statusFx[e.side]){ this.statusFx[e.side](); this.statusFx[e.side]=null; }
          banner(`${nm(e.side)} ${{sleep:'woke up!',freeze:'thawed out!'}[e.status]||'is healthy again!'}`,900); this.renderCardsFrom(st); await wait(700); break; }
        case 'skip': { const m=this.mons[e.side]; fx.statusPuff(m, e.reason); banner(`${nm(e.side)} ${{sleep:'is fast asleep…',freeze:'is frozen solid!',paralyze:"is paralyzed! It can't move!"}[e.reason]}`,1100); await wait(1000); break; }
        case 'fail': banner('But it failed!',900); await wait(700); break;
        case 'miss': break;
        case 'tick': { const m=this.mons[e.side]; const f=E.active(st,e.side); f.hp=e.hp; fx.statusPuff(m,e.status); hitFlash(m, e.status==='burn'?'fire':'shadow'); m.play('HitReact',{once:true}); dmgNum(m,'-'+e.amount,''); this.setHp(e.side,e.hp,e.maxhp);
          banner(`${nm(e.side)} is hurt by its ${e.status==='burn'?'burn':'curse'}!`,1000); await wait(900); break; }
        case 'faint': { const m=this.mons[e.side]; banner(`${nm(e.side)} fainted!`,1300); audio.faint(); m.alive=false; m.play('Death',{once:true,back:false,fade:0.1});
          if(this.auras[e.side]){ this.auras[e.side](); this.auras[e.side]=null; } if(this.statusFx[e.side]){ this.statusFx[e.side](); this.statusFx[e.side]=null; }
          await wait(1100); fx.burst(m.holder.position.clone().add(V(0,0.4,0)),{count:30,color:0x999999,tile:1,speed:1.5,size:0.6,size1:1.4,life:1,normal:true,alpha:0.6,upOnly:true});
          await fx.tween(0.5,k=>{ m.inner.scale.setScalar(Math.max(0.001,(1-k))); m.holder.position.y=-k*0.3; });
          st.sides[e.side].team[st.sides[e.side].active].hp=0; this.renderCardsFrom(st); break; }
        case 'switch': {
          const S2=st.sides[e.side];
          if(!e.forced){ const m=this.mons[e.side]; banner(`${e.side===this.me?'Come back':'Foe recalls'} ${MONSTERS[S2.team[S2.active].id].name}!`,900); fx.summon(m, MONSTERS[S2.team[S2.active].id].type); await fx.tween(0.35,k=>m.inner.scale.setScalar(Math.max(0.001,(1-k)))); }
          S2.active=e.to; const f=S2.team[e.to]; f.stages={atk:0,def:0,spd:0,acc:0};
          this.b.sides[e.side].active = e.to; // keep local view consistent for rendering
          const saveB=this.b; this.b=st; this.spawn(e.side, e.id); this.b=saveB;
          banner(`${e.side===this.me?'Go':this.names[e.side]+' sends out'} ${MONSTERS[e.id].name}!`,1100); this.renderCardsFrom(st); await wait(1000); break; }
        case 'sudden': banner('Sudden death! Every hit is stronger!',1500,true); flashScreen('#ff2a00',0.25); await wait(1200); break;
        case 'forfeit': banner(`${this.names[e.side]} left the battle`,1500); await wait(1200); break;
        case 'end': break;
      }
    }
    } finally { this.busy=false; }
  }
  renderCardsFrom(st){ const save=this.b; this.b=st; $('#meCard').innerHTML=this.fighterHTML(this.me); $('#foeCard').innerHTML=this.fighterHTML(this.opp); this.b=save; }
  async finish(winner, v){
    if(this.ended) return; this.ended=true; this.finishedRound=this.round; this.setPhase('over');
    const won = winner===this.me, draw = winner===-1;
    const wm=this.mons[winner===-1?this.me:winner]; if(wm && wm.alive) wm.play('Wave',{fade:0.3});
    if(wm){ const p=wm.holder.position.clone(); const dir=this.cam.pos.clone().sub(p).setY(0).normalize(); stage.camOverride={pos:p.clone().addScaledVector(dir,5.2).add(V(0,1.9,0)), look:p.clone().add(V(0,1.0,0)), speed:2}; }
    banner(won?'You win!':draw?'Draw!':'You lost…', 1800);
    await wait(1800);
    const xp = won ? 100 : 40; S.stats.xp += xp; if(won) S.stats.wins++; else if(!draw) S.stats.losses++; store.set('stats', S.stats);
    $('.resultBox').classList.toggle('lose', !won);
    $('#resTitle').textContent = won?'VICTORY!':draw?'DRAW':'DEFEAT';
    $('#resSub').textContent = won ? `You beat ${this.names[this.opp]}!` : draw ? 'Nobody is left standing!' : `${this.names[this.opp]} won this time.`;
    $('#resXp').textContent = `+${xp} XP · Trainer Lv ${level(S.stats.xp)}`;
    $('#resNote').textContent = this.mode==='online' ? 'Rematch starts when both players tap it.' : '';
    show('result'); if(won){ audio.win(); confetti(); } else audio.lose();
    $('#btnRematch').disabled=false; $('#btnRematch').textContent='🔁 Rematch';
    $('#btnRematch').onclick = async()=>{
      if(this.mode==='cpu'){ const t=this.teams; stage.camOverride=null; startBattle({...this.cfgCopy(), teams:[S.team, rivalTeam(S.team)]}); confettiStop(); return; }
      $('#btnRematch').disabled=true; $('#btnRematch').textContent='Waiting for opponent…'; const r=await this.net.rematch(); if(!r.ok){ toast(r.error||'Could not rematch'); $('#btnRematch').disabled=false; $('#btnRematch').textContent='🔁 Rematch'; }
    };
    $('#btnHome').onclick = ()=>{ confettiStop(); stage.camOverride=null; if(this.net){ this.net.leave(); this.net.stop(); } enterMenu(); };
  }
  botChat(ev){
    if(!this.bot || Math.random()>0.35) return; const me=this.me, op=this.opp; let say=null;
    if(ev.some(e=>e.t==='damage'&&e.side===me&&e.eff===2)) say=['😎','Watch this! 😎','🔥🔥'][Math.floor(Math.random()*3)];
    else if(ev.some(e=>e.t==='damage'&&e.side===op&&e.eff===2)) say=['😮','Oops 😅','😡'][Math.floor(Math.random()*3)];
    else if(ev.some(e=>e.t==='faint'&&e.side===op)) say=['😡','Nice move! 👍'][Math.floor(Math.random()*2)];
    if(say) setTimeout(()=>this.showEmote(op, say), 400+Math.random()*800);
  }
  cfgCopy(){ return { mode:this.mode, bot:this.bot, diff:this.diff, arena:this.arena, mySide:0, names:this.names, teams:this.teams, faces:this.faces }; }
  showEmote(seat, text){
    const m=this.mons[seat]; if(!m) return; const p=stage.worldToScreen(m.holder.position.clone().add(V(0,2.6,0)));
    const b=document.createElement('div'); b.className='bubble'; b.textContent=text; b.style.left=Math.min(window.innerWidth-160,Math.max(8,p.x-60))+'px'; b.style.top=Math.max(60,p.y-30)+'px';
    $('#emoteBubbles').appendChild(b); setTimeout(()=>b.remove(),2700); audio.tick();
  }
  tutorial(){
    const steps=['Tap a move to attack. Colors show the move type — a SUPER tag means it hits hard!','Fill the ⚡ meter by fighting, then unleash your ULTIMATE for a huge cinematic attack.','Use 🔄 Switch to swap monsters. Beat all 3 of your rival\'s monsters to win!'];
    let i=0; const el=document.createElement('div'); el.className='coach glass'; el.style.top='38%'; document.body.appendChild(el);
    const next=()=>{ if(i>=steps.length){ el.remove(); store.set('tut',true); return; } el.innerHTML=`<div>${steps[i]}</div><button class="btn small primary">${i<steps.length-1?'Next':'Let\'s go!'}</button>`; el.querySelector('button').onclick=()=>{ i++; next(); }; };
    next();
  }
  destroy(){ this.destroyed=true; if(this.net){ this.net.stop(); this.net.onView=null; } for(const s of [0,1]){ if(this.auras[s]) this.auras[s](); if(this.statusFx[s]) this.statusFx[s](); if(this.mons[s]){ this.mons[s].alive=false; this.mons[s].dispose(); } } this.mons=[null,null]; stage.camOverride=null; $('.coach')&&$('.coach').remove(); }
}
function shade(hex, amt){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+amt, g=((n>>8)&255)+amt, b=(n&255)+amt; r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b)); return `rgb(${r},${g},${b})`; }
function banner(t, ms=1200, big){ const el=$('#banner'); el.textContent=t; el.classList.add('show'); el.style.color = big? '#ffcc33':'#fff'; clearTimeout(banner._t); banner._t=setTimeout(()=>el.classList.remove('show'), ms); }
function callout(t,color){ const el=document.createElement('div'); el.className='callout'; el.textContent=t; el.style.color=color; $('#callouts').appendChild(el); setTimeout(()=>el.remove(),1300); }
function dmgNum(mon, text, cls){ const p=stage.worldToScreen(mon.holder.position.clone().add(V(0,2.0,0))); const el=document.createElement('div'); el.className='dnum '+cls; el.textContent=text; el.style.left=(p.x+(Math.random()-0.5)*30)+'px'; el.style.top=p.y+'px'; $('#dmg').appendChild(el); setTimeout(()=>el.remove(),1150); }
function hitFlash(mon, type){ const col=new THREE.Color(TYPE_INFO[type]?TYPE_INFO[type].color:'#ffffff'); fx.tween(0.35,k=>{ const a=k<0.2?1:(1-k)/0.8; mon.mats.forEach(m=>{ m.emissive.copy(col).multiplyScalar(a*0.55); }); }); }
function knock(mon, from){ const p0=mon.holder.position.clone(); const dir=p0.clone().sub(from).setY(0).normalize(); fx.tween(0.4,k=>{ const o=Math.sin(k*Math.PI)*0.35*(1-k*0.3); mon.holder.position.copy(p0).addScaledVector(dir,o); }); }

// ---------- HUD wiring ----------
function setupHud(){
  $('#btnSwitch').onclick=()=>{ if(!battle||battle.phase!=='choose') return; const s=battle.b.sides[battle.me];
    $('#switchList').innerHTML = s.team.map((t,i)=>{ const m=MONSTERS[t.id]; return `<button class="swi" data-i="${i}" ${i===s.active||t.hp<=0?'disabled':''}><img src="${thumbs[t.id]}"><span class="grow">${m.name} ${typeChip(m.type)}<div class="note">${t.hp<=0?'Fainted':`HP ${t.hp}/${t.maxhp}`}${i===s.active?' · in battle':''}</div></span></button>`; }).join('');
    $$('#switchList .swi').forEach(b=>b.onclick=()=>battle.choose({type:'switch',to:+b.dataset.i})); $('#switchSheet').classList.add('show'); };
  $('#switchClose').onclick=()=>$('#switchSheet').classList.remove('show');
  $('#btnUlt').onclick=()=>battle && battle.choose({type:'ult'});
  $('#emoteList').innerHTML = EMOTES.map(e=>`<button>${e}</button>`).join('');
  $$('#emoteList button').forEach(b=>b.onclick=()=>{ $('#emoteSheet').classList.remove('show'); if(battle&&battle.net){ battle.net.emote(b.textContent); battle.showEmote(battle.me, b.textContent); } else if(battle&&battle.bot){ battle.showEmote(battle.me, b.textContent); if(Math.random()<0.6) setTimeout(()=>battle&&battle.showEmote(battle.opp, ['😂','GG 🤝','😎','Nice move! 👍'][Math.floor(Math.random()*4)]), 900+Math.random()*1200); } });
  $('#btnEmote').onclick=()=>$('#emoteSheet').classList.toggle('show');
  $('#btnMute').onclick=()=>{ audio.setMuted(!audio.muted); $('#btnMute').textContent = audio.muted?'🔇':'🔊'; };
  $('#btnMute').textContent = audio.muted?'🔇':'🔊';
  $('#btnQuit').onclick=()=>$('#quitSheet').classList.add('show');
  $('#quitNo').onclick=()=>$('#quitSheet').classList.remove('show');
  $('#quitYes').onclick=()=>{ $('#quitSheet').classList.remove('show'); if(battle){ if(battle.net){ battle.net.leave(); } S.stats.losses++; store.set('stats',S.stats); } enterMenu(); };
  window.addEventListener('pagehide', ()=>{ if(battle && battle.net) battle.net.leave(); if(lobbyNet) lobbyNet.leave(); });
}

// ---------- settings / how to ----------
function openSettings(){ show('settings'); $('#fpsNote').textContent = `Current speed: ${Math.round(window.__fps||0)} fps · Graphics: ${quality==='high'?'High':'Low'}`; }
function setupSettings(){
  $$('#qSeg button').forEach(b=>{ b.classList.toggle('on', b.dataset.q===quality); b.onclick=()=>{ store.set('quality', b.dataset.q); if(b.dataset.q!==quality){ toast('Restarting with new graphics…'); setTimeout(()=>location.replace(location.pathname),600); } }; });
  const sw=(id,val,fn)=>{ const el=$(id); el.checked=val; el.onchange=()=>fn(el.checked); };
  sw('#setSound', !audio.muted, v=>{ audio.setMuted(!v); $('#btnMute').textContent = audio.muted?'🔇':'🔊'; });
  sw('#setMusic', audio.musicOn, v=>audio.setMusic(v));
  sw('#setVibe', audio.vibe, v=>{ audio.vibe=v; localStorage.setItem('ff_vibe', v?'1':'0'); });
  sw('#setShare', S.share, v=>{ S.share=v; store.set('share',v); });
}
function buildHow(){
  const types=['fire','water','grass','electric','ice','earth','shadow','wind'];
  $('#howBody').innerHTML = `<p><b>1. Add your face</b> — tap 📷 My Face, take a selfie, fit your face in the circle. It appears on all your monsters.</p>
  <p><b>2. Pick 3 monsters</b> and an arena. Your first pick fights first.</p>
  <p><b>3. Battle!</b> Each turn both players pick a move. Faster monsters strike first. Beat all 3 enemy monsters to win.</p>
  <p><b>⚡ Ultimate:</b> fighting fills your meter. When it is full, unleash a huge cinematic attack — your monster also SURGES (bigger and stronger).</p>
  <p><b>Status:</b> 🔥 Burn and 💀 Curse hurt every turn · ⚡ Paralyze can stop a move · 😴 Sleep and 🧊 Freeze skip turns.</p>
  <p><b>Play with a friend:</b> tap “Play with a Friend”, pick your team and share the 5-letter code on WhatsApp. Your friend taps “Join with Code” (or opens your link) — works on any phone with internet.</p>
  <p><b>Type chart</b> (attack type → strong against):</p>
  <table class="tchart">${types.map(t=>`<tr><td>${typeChip(t)}</td><td>strong vs ${E.strongAgainst(t).map(x=>typeChip(x)).join(' ')}</td></tr>`).join('')}</table>`;
}

// ---------- confetti ----------
let confT=null;
function confetti(){ const c=$('#confetti'), g=c.getContext('2d'); c.width=innerWidth; c.height=innerHeight; const P=[]; const cols=['#ffcc33','#ff6a2b','#5ee7ff','#7dffa1','#ff3df2','#ffffff'];
  for(let i=0;i<160;i++) P.push({x:Math.random()*c.width,y:-20-Math.random()*c.height*0.5,vx:(Math.random()-0.5)*2,vy:2+Math.random()*3,r:Math.random()*6.28,vr:(Math.random()-0.5)*0.3,w:6+Math.random()*6,h:8+Math.random()*8,c:cols[i%cols.length]});
  let t0=performance.now(); const step=()=>{ g.clearRect(0,0,c.width,c.height); for(const p of P){ p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; p.vx+=Math.sin(p.y/40)*0.05; g.save(); g.translate(p.x,p.y); g.rotate(p.r); g.fillStyle=p.c; g.fillRect(-p.w/2,-p.h/2,p.w,p.h); g.restore(); }
    if(performance.now()-t0<5000) confT=requestAnimationFrame(step); else g.clearRect(0,0,c.width,c.height); }; step(); }
function confettiStop(){ cancelAnimationFrame(confT); const c=$('#confetti'); c.getContext('2d').clearRect(0,0,c.width,c.height); }

window.ffBack = ()=>{ // called by the Android app's back button
  if(S.screen==='home') return false;
  if(S.screen==='hud'){ $('#quitSheet').classList.toggle('show'); return true; }
  if(S.screen==='result'){ $('#btnHome').click(); return true; }
  if(S.screen==='lobby'){ $('#lobbyCancel').click(); return true; }
  if(S.screen==='search'){ $('#searchCancel').click(); return true; }
  const b=document.querySelector('.screen.show [data-back]'); if(b){ b.click(); return true; } enterMenu(); return true; };
window.__ff = { get battle(){ return battle; }, get stage(){ return stage; }, get fx(){ return fx; }, thumbs, S, store };
boot();
