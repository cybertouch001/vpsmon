
import * as E from './engine.js';
const ROOM_TTL_MS = 3*3600*1000;      // rooms (and photos) are deleted 3 h after last activity
const TURN_LIMIT_MS = 45000;          // AFK auto-move
const J = (o, s=200) => new Response(JSON.stringify(o), {status:s, headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'}});
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){ let s=''; const a=new Uint8Array(5); crypto.getRandomValues(a); for(const x of a) s+=CODE_CHARS[x%CODE_CHARS.length]; return s; }
function token(){ const a=new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function clean(s, n){ return String(s||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,n); }
let schemaReady = false;
async function schema(db){
  if(schemaReady) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, ver INTEGER NOT NULL, created INTEGER, updated INTEGER, state TEXT, photo0 TEXT, photo1 TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS mm (code TEXT PRIMARY KEY, created INTEGER)`).run();
  schemaReady = true;
}
async function load(db, c){ return await db.prepare('SELECT code, ver, state, updated FROM rooms WHERE code=?').bind(c).first(); }
async function save(db, c, ver, st){
  const r = await db.prepare('UPDATE rooms SET state=?, ver=ver+1, updated=? WHERE code=? AND ver=?').bind(JSON.stringify(st), Date.now(), c, ver).run();
  return r.meta && r.meta.changes === 1;
}
function seatOf(st, tok){ if(!tok) return -1; return st.players.findIndex(p=>p && p.token===tok); }
function publicView(st, seat, ver){
  const now = Date.now();
  return { ver, you:seat, status:st.status, arena:st.arena,
    players: st.players.map((p,i)=> p ? {name:p.name, team:p.team, hasPhoto:!!p.hasPhoto, photoRev:p.photoRev||0, online: now-(p.seen||0) < 12000, ready: st.pending && st.pending[i]!=null} : null),
    battle: st.battle, log: st.log.slice(-6), deadline: st.deadline||0, now, emotes: st.emotes.slice(-8), rematch: st.rematch, round: st.round||1 };
}
function startBattle(st){
  const seed = (Math.random()*4294967295)>>>0;
  st.battle = E.createBattle(st.players[0].team, st.players[1].team, seed);
  st.status = 'battle'; st.pending = [null,null]; st.log = []; st.deadline = Date.now()+TURN_LIMIT_MS; st.rematch=[false,false];
}
function maybeResolve(st, force){
  if(st.status!=='battle' || !st.battle || st.battle.winner!==null) return false;
  const p = st.pending;
  if(force){ for(const i of [0,1]) if(p[i]==null) p[i] = E.cpuAction(st.battle, i); }
  if(p[0]==null || p[1]==null) return false;
  const events = E.resolveTurn(st.battle, [p[0], p[1]]);
  st.log.push({turn: st.battle.turn, actions:[p[0],p[1]], events});
  if(st.log.length>12) st.log = st.log.slice(-12);
  st.pending = [null,null];
  if(st.battle.winner!==null){ st.status='over'; st.deadline=0; } else st.deadline = Date.now()+TURN_LIMIT_MS + 4000;
  return true;
}
async function createRoom(db, body, quick){
  const photo = typeof body.photo==='string' && body.photo.startsWith('data:image/') && body.photo.length < 120000 ? body.photo : null;
  const arena = ['meadow','canyon','snow','city'].includes(body.arena) ? body.arena : ['meadow','canyon','snow','city'][Math.floor(Math.random()*4)];
  await db.prepare('DELETE FROM rooms WHERE updated < ?').bind(Date.now()-ROOM_TTL_MS).run();
  for(let tries=0; tries<5; tries++){
    const c = code(), tok = token(), now=Date.now();
    const st = { status:'waiting', quick:!!quick, arena, players:[{name:clean(body.name,16)||'Player 1', token:tok, team:body.team, hasPhoto:!!photo, photoRev:1, seen:now}, null], pending:[null,null], battle:null, log:[], emotes:[], rematch:[false,false], round:1 };
    try{ await db.prepare('INSERT INTO rooms (code, ver, created, updated, state, photo0) VALUES (?,?,?,?,?,?)').bind(c,1,now,now,JSON.stringify(st),photo).run(); return {ok:true, code:c, token:tok}; }catch(e){}
  }
  return {ok:false, error:'Could not create a room, try again'};
}
async function joinRoom(db, c, body){
  for(let attempt=0; attempt<5; attempt++){
    const row = await load(db, c); if(!row) return {ok:false, error:'Room not found. Check the code.', status:404};
    const st = JSON.parse(row.state);
    if(st.players[1]) return {ok:false, error:'This room is already full', status:409};
    if(!E.validTeam(body.team)) return {ok:false, error:'Pick 3 different monsters', status:400};
    const photo = typeof body.photo==='string' && body.photo.startsWith('data:image/') && body.photo.length < 120000 ? body.photo : null;
    const ntok = token();
    st.players[1] = {name:clean(body.name,16)||'Player 2', token:ntok, team:body.team, hasPhoto:!!photo, photoRev:1, seen:Date.now()};
    startBattle(st);
    const r = await db.prepare('UPDATE rooms SET state=?, ver=ver+1, updated=?, photo1=? WHERE code=? AND ver=?').bind(JSON.stringify(st), Date.now(), photo, c, row.ver).run();
    if(r.meta.changes===1) return {ok:true, token:ntok};
  }
  return {ok:false, error:'Busy, try again', status:503};
}
async function api(req, env, url){
  const db = env.DB; await schema(db);
  const path = url.pathname.slice(5);
  let body = {};
  if(req.method==='POST'){ try{ body = await req.json(); }catch(e){ return J({error:'bad json'},400); } }
  const q = (k)=> body[k]!==undefined ? body[k] : url.searchParams.get(k);
  if(path==='health') return J({ok:true, game:'FaceFang Arena', v:1});
  if(path==='quick'){
    const team = body.team; if(!E.validTeam(team)) return J({error:'Pick 3 different monsters'},400);
    // try to claim someone who is already waiting (seen in the last 20 s)
    for(let k=0;k<4;k++){
      const w0 = await db.prepare('SELECT code FROM mm WHERE created > ? ORDER BY created LIMIT 1').bind(Date.now()-20000).first();
      if(!w0) break;
      const del = await db.prepare('DELETE FROM mm WHERE code=?').bind(w0.code).run();
      if(del.meta.changes!==1) continue;           // someone else got them first
      const jr = await joinRoom(db, w0.code, body);
      if(jr.ok) return J({code:w0.code, token:jr.token, seat:1, matched:true});
    }
    await db.prepare('DELETE FROM mm WHERE created < ?').bind(Date.now()-60000).run();
    const cr = await createRoom(db, body, true);
    if(!cr.ok) return J({error:cr.error},500);
    await db.prepare('INSERT INTO mm (code, created) VALUES (?,?)').bind(cr.code, Date.now()).run();
    return J({code:cr.code, token:cr.token, seat:0, matched:false});
  }
  if(path==='quick_cancel'){
    const c = clean(body.code,8).toUpperCase(); const row = await load(db, c); if(!row) return J({cancelled:true});
    const st = JSON.parse(row.state); if(seatOf(st, body.token)!==0) return J({error:'Not your room'},403);
    const del = await db.prepare('DELETE FROM mm WHERE code=?').bind(c).run();
    if(del.meta.changes===1 && st.status==='waiting'){ await db.prepare('DELETE FROM rooms WHERE code=? AND ver=?').bind(c,row.ver).run(); return J({cancelled:true}); }
    return J({cancelled:false, status:st.status});
  }
  if(path==='create'){
    const team = body.team; if(!E.validTeam(team)) return J({error:'Pick 3 different monsters'},400);
    const cr = await createRoom(db, body, false); if(!cr.ok) return J({error:cr.error},500);
    return J({code:cr.code, token:cr.token, seat:0});
  }
  const c = clean(q('code'),8).toUpperCase();
  if(!c) return J({error:'Room code missing'},400);
  if(path==='peek'){ const row = await load(db, c); if(!row) return J({exists:false}); const st=JSON.parse(row.state); return J({exists:true, full:!!st.players[1], status:st.status}); }
  for(let attempt=0; attempt<6; attempt++){
    const row = await load(db, c);
    if(!row) return J({error:'Room not found. Check the code.'},404);
    const st = JSON.parse(row.state); const tok = q('token'); let seat = seatOf(st, tok);
    if(path==='join'){
      if(seat>=0) return J({code:c, token:tok, seat});
      const jr = await joinRoom(db, c, body); if(!jr.ok) return J({error:jr.error}, jr.status||500);
      return J({code:c, token:jr.token, seat:1});
    }
    if(seat<0) return J({error:'Not a player in this room'},403);
    if(path==='photo'){
      const s = Number(q('seat'))===1?1:0;
      const pr = await db.prepare(`SELECT photo${s} AS p FROM rooms WHERE code=?`).bind(c).first();
      return J({photo: pr ? pr.p : null});
    }
    if(path==='state'){
      const since = Number(q('v')||0);
      let changed = false;
      const now = Date.now();
      // heartbeat (write at most every 4 s), AFK auto-move
      if(now - (st.players[seat].seen||0) > 4000){ st.players[seat].seen = now; changed = true; }
      if(st.status==='battle' && st.deadline && now > st.deadline && (st.pending[0]!=null || st.pending[1]!=null || now > st.deadline + 30000)){ if(maybeResolve(st, true)) changed = true; }
      if(changed){ if(!(await save(db, c, row.ver, st))) continue; return J(publicView(st, seat, row.ver+1)); }
      if(since === row.ver) return J({same:true, ver:row.ver, now});
      return J(publicView(st, seat, row.ver));
    }
    if(path==='act'){
      if(st.status!=='battle') return J({error:'No battle running'},409);
      if(Number(q('turn'))!==st.battle.turn) return J({error:'stale turn', ver:row.ver},409);
      const a = body.action;
      if(!E.validAction(st.battle, seat, a)) return J({error:'Invalid action'},400);
      st.pending[seat] = a; st.players[seat].seen = Date.now();
      maybeResolve(st, false);
      if(!(await save(db, c, row.ver, st))) continue;
      return J({ok:true, ver:row.ver+1});
    }
    if(path==='emote'){
      const e = clean(body.emote, 24); if(!e) return J({error:'empty'},400);
      st.emotes.push({id: (st.emotes.length? st.emotes[st.emotes.length-1].id+1 : 1), seat, e, at:Date.now()});
      if(st.emotes.length>10) st.emotes = st.emotes.slice(-10);
      if(!(await save(db, c, row.ver, st))) continue;
      return J({ok:true});
    }
    if(path==='rematch'){
      if(st.status!=='over') return J({error:'Battle not over'},409);
      st.rematch[seat] = true;
      if(st.rematch[0] && st.rematch[1]){ st.round=(st.round||1)+1; startBattle(st); }
      if(!(await save(db, c, row.ver, st))) continue;
      return J({ok:true});
    }
    if(path==='leave'){
      st.players[seat].left = true; st.players[seat].seen = 0;
      if(st.status==='battle'){ st.status='over'; st.battle.winner = 1-seat; st.forfeit = seat; st.log.push({turn:st.battle.turn+1, events:[{t:'forfeit',side:seat},{t:'end',winner:1-seat}]}); }
      const bothGone = st.players.every(p=>!p || p.left);
      if(bothGone){ await db.prepare('DELETE FROM rooms WHERE code=?').bind(c).run(); return J({ok:true, deleted:true}); }
      const r = await db.prepare(`UPDATE rooms SET state=?, ver=ver+1, updated=?, photo${seat}=NULL WHERE code=? AND ver=?`).bind(JSON.stringify(st), Date.now(), c, row.ver).run();
      if(r.meta.changes!==1) continue;
      return J({ok:true});
    }
    return J({error:'unknown endpoint'},404);
  }
  return J({error:'Busy, try again'},503);
}
export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if(url.pathname.startsWith('/api/')){
      if(req.method==='OPTIONS') return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST'}});
      try{ return await api(req, env, url); }catch(e){ return J({error:'Server error', detail:String(e && e.message || e)},500); }
    }
    const res = await env.ASSETS.fetch(req);
    if(url.pathname.endsWith('.apk') && res.ok){ const h=new Headers(res.headers); h.set('content-type','application/vnd.android.package-archive'); h.set('content-disposition','attachment; filename="FaceFang-Arena.apk"'); return new Response(res.body,{status:200,headers:h}); }
    if(/\.(glb|jpg|woff2|png)$/.test(url.pathname) && res.ok){
      const h = new Headers(res.headers); h.set('cache-control','public, max-age=604800');
      return new Response(res.body, {status:res.status, headers:h});
    }
    return res;
  }
};
