
// VPSmon — battle rules (shared by browser and server)
export const TYPES = ['fire','water','grass','electric','ice','earth','shadow','wind','neutral'];
export const TYPE_INFO = {
  fire:{label:'Fire',color:'#ff6a2b'}, water:{label:'Water',color:'#2f9bff'}, grass:{label:'Grass',color:'#3fc75a'},
  electric:{label:'Electric',color:'#ffd21f'}, ice:{label:'Ice',color:'#7fe3ff'}, earth:{label:'Earth',color:'#c08a4a'},
  shadow:{label:'Shadow',color:'#9b5cff'}, wind:{label:'Wind',color:'#9fe8c9'}, neutral:{label:'Normal',color:'#b8b8c8'}
};
const STRONG = { fire:['grass','ice'], water:['fire','earth'], grass:['water','earth'], electric:['water','wind'],
  ice:['grass','wind'], earth:['fire','electric'], shadow:['electric','ice'], wind:['grass','shadow'], neutral:[] };
const WEAK = { fire:['water','earth'], water:['grass','water'], grass:['fire','wind'], electric:['earth','grass'],
  ice:['fire','water'], earth:['grass','wind'], shadow:['shadow','wind'], wind:['earth','electric'], neutral:[] };
export function typeMult(atk, def){ if(STRONG[atk]&&STRONG[atk].includes(def)) return 2; if(WEAK[atk]&&WEAK[atk].includes(def)) return 0.5; return 1; }
export function strongAgainst(t){ return STRONG[t]||[]; }
export function weakAgainst(t){ return TYPES.filter(a=>STRONG[a]&&STRONG[a].includes(t)); }

// fx: visual archetype used by the renderer
export const MOVES = {
  ember_shot:{name:'Ember Shot',type:'fire',power:45,acc:100,fx:'fireball',effect:{status:'burn',chance:15}},
  inferno:{name:'Inferno Blast',type:'fire',power:90,acc:85,fx:'firestorm',effect:{status:'burn',chance:25}},
  trident:{name:'Trident Strike',type:'neutral',power:60,acc:100,fx:'melee',crit:2},
  war_cry:{name:'War Cry',type:'fire',power:0,acc:100,fx:'buff',self:{atk:1}, desc:'Attack up'},

  aqua_jet:{name:'Aqua Jet',type:'water',power:40,acc:100,fx:'waterjet',priority:1},
  tidal_crash:{name:'Tidal Crash',type:'water',power:85,acc:90,fx:'wave'},
  jaw_clamp:{name:'Jaw Clamp',type:'neutral',power:65,acc:95,fx:'melee'},
  healing_mist:{name:'Healing Mist',type:'water',power:0,acc:100,fx:'heal',heal:35, desc:'Heals 35% HP'},

  needle_burst:{name:'Needle Burst',type:'grass',power:50,acc:100,fx:'needles'},
  vine_lash:{name:'Vine Lash',type:'grass',power:80,acc:90,fx:'vines'},
  sleep_spores:{name:'Sleep Spores',type:'grass',power:0,acc:75,fx:'spores',effect:{status:'sleep',chance:100}, desc:'Puts foe to sleep'},
  thorn_guard:{name:'Thorn Guard',type:'grass',power:0,acc:100,fx:'shield',self:{def:2}, desc:'Defense up a lot'},

  spark:{name:'Spark',type:'electric',power:45,acc:100,fx:'spark',effect:{status:'paralyze',chance:20}},
  storm_bolt:{name:'Storm Bolt',type:'electric',power:90,acc:85,fx:'lightning',effect:{status:'paralyze',chance:15}},
  tongue_whip:{name:'Tongue Whip',type:'neutral',power:50,acc:100,fx:'melee',priority:1},
  charge_up:{name:'Charge Up',type:'electric',power:0,acc:100,fx:'buff',self:{atk:1,spd:1}, desc:'Attack & speed up'},

  frost_breath:{name:'Frost Breath',type:'ice',power:50,acc:100,fx:'frostbreath',effect:{status:'freeze',chance:15}},
  glacier_smash:{name:'Glacier Smash',type:'ice',power:90,acc:85,fx:'iceshards'},
  avalanche_punch:{name:'Avalanche Punch',type:'neutral',power:70,acc:95,fx:'melee'},
  snow_cloak:{name:'Snow Cloak',type:'ice',power:0,acc:100,fx:'shield',self:{def:1},heal:20, desc:'Defense up + heal'},

  shadow_orb:{name:'Shadow Orb',type:'shadow',power:60,acc:100,fx:'shadoworb'},
  nightmare:{name:'Nightmare',type:'shadow',power:80,acc:90,fx:'nightmare',effect:{status:'curse',chance:30}},
  life_drain:{name:'Life Drain',type:'shadow',power:50,acc:100,fx:'drain',drain:50},
  mind_fog:{name:'Mind Fog',type:'shadow',power:0,acc:90,fx:'debuff',foe:{acc:-1,atk:-1}, desc:'Foe attack & accuracy down'},

  rock_throw:{name:'Rock Throw',type:'earth',power:55,acc:95,fx:'rock'},
  quake_slam:{name:'Quake Slam',type:'earth',power:95,acc:85,fx:'quake'},
  club_bash:{name:'Club Bash',type:'neutral',power:65,acc:100,fx:'melee'},
  iron_skin:{name:'Iron Skin',type:'earth',power:0,acc:100,fx:'shield',self:{def:2}, desc:'Defense up a lot'},

  gust_slash:{name:'Gust Slash',type:'wind',power:45,acc:100,fx:'windslash',priority:1},
  cyclone:{name:'Cyclone',type:'wind',power:85,acc:90,fx:'tornado'},
  feather_storm:{name:'Feather Storm',type:'wind',power:60,acc:95,fx:'feathers',foeAfter:{def:-1}},
  tailwind:{name:'Tailwind',type:'wind',power:0,acc:100,fx:'buff',self:{spd:2}, desc:'Speed up a lot'},
};
export const ULTS = {
  fire:{name:'Supernova',type:'fire',power:130,acc:1000,fx:'ult_fire'},
  water:{name:'Tsunami Fang',type:'water',power:130,acc:1000,fx:'ult_water'},
  grass:{name:'Forest Wrath',type:'grass',power:130,acc:1000,fx:'ult_grass'},
  electric:{name:'Gigavolt Storm',type:'electric',power:130,acc:1000,fx:'ult_electric'},
  ice:{name:'Absolute Zero',type:'ice',power:130,acc:1000,fx:'ult_ice'},
  earth:{name:'Meteor Fall',type:'earth',power:130,acc:1000,fx:'ult_earth'},
  shadow:{name:'Void Eclipse',type:'shadow',power:130,acc:1000,fx:'ult_shadow'},
  wind:{name:'Sky Hurricane',type:'wind',power:130,acc:1000,fx:'ult_wind'},
};
export const MONSTERS = {
  blazimp:{name:'Blazimp',type:'fire',model:'blazimp',hp:155,atk:110,def:86,spd:95,moves:['ember_shot','inferno','trident','war_cry'],blurb:'A hot-headed imp that juggles fireballs with its trident.'},
  tidefang:{name:'Tidefang',type:'water',model:'tidefang',hp:170,atk:100,def:95,spd:80,moves:['aqua_jet','tidal_crash','jaw_clamp','healing_mist'],blurb:'Walks out of the sea when it smells a fight.'},
  pricklor:{name:'Pricklor',type:'grass',model:'pricklor',hp:165,atk:96,def:105,spd:70,moves:['needle_burst','vine_lash','sleep_spores','thorn_guard'],blurb:'A desert brawler covered in needles. Hugs are not advised.'},
  zaptoad:{name:'Zaptoad',type:'electric',model:'zaptoad',hp:145,atk:106,def:80,spd:110,moves:['spark','storm_bolt','tongue_whip','charge_up'],blurb:'Stores lightning in its cheeks and croaks thunder.'},
  frostbane:{name:'Frostbane',type:'ice',model:'frostbane',hp:180,atk:106,def:95,spd:60,moves:['frost_breath','glacier_smash','avalanche_punch','snow_cloak'],blurb:'A mountain giant whose breath freezes rivers.'},
  voidroth:{name:'Voidroth',type:'shadow',model:'voidroth',hp:150,atk:108,def:85,spd:100,moves:['shadow_orb','nightmare','life_drain','mind_fog'],blurb:'Came from the dark between the stars. Feeds on fear.'},
  grumbash:{name:'Grumbash',type:'earth',model:'grumbash',hp:172,atk:108,def:106,spd:50,moves:['rock_throw','quake_slam','club_bash','iron_skin'],blurb:'Slow, stubborn and strong enough to split boulders.'},
  gustbeak:{name:'Gustbeak',type:'wind',model:'gustbeak',hp:150,atk:102,def:82,spd:115,moves:['gust_slash','cyclone','feather_storm','tailwind'],blurb:'The fastest beak in the sky. Rides the storm.'},
};
export const MONSTER_IDS = Object.keys(MONSTERS);
export const TEAM_SIZE = 3;

export function rng(seed){ let s = (seed>>>0)||1; return function(){ s ^= s<<13; s>>>=0; s ^= s>>>17; s ^= s<<5; s>>>=0; return (s>>>0)/4294967296; }; }

function mkFighter(id){ const m = MONSTERS[id]; return { id, hp:m.hp, maxhp:m.hp, status:null, sleep:0, frozen:0, heals:0, stages:{atk:0,def:0,spd:0,acc:0}, surged:false }; }
export function validTeam(team){ return Array.isArray(team) && team.length===TEAM_SIZE && team.every(t=>MONSTERS[t]) && new Set(team).size===TEAM_SIZE; }
export function createBattle(p1team, p2team, seed){
  return { turn:0, seed:(seed>>>0)||12345, sides:[0,1].map(i=>({ team:(i?p2team:p1team).map(mkFighter), active:0, charge:0 })), winner:null };
}
function stageMult(s){ return s>=0 ? (2+s)/2 : 2/(2-s); }
function accMult(s){ return s>=0 ? (3+s)/3 : 3/(3-s); }
export function active(b, side){ return b.sides[side].team[b.sides[side].active]; }
export function effStat(f, stat){ const m = MONSTERS[f.id]; let v = m[stat]*stageMult(f.stages[stat]); if(stat==='spd' && f.status==='paralyze') v*=0.5; if(stat==='atk' && f.surged) v*=1.2; return v; }
export function legalActions(b, side){
  const s=b.sides[side], f=active(b,side), acts=[];
  MONSTERS[f.id].moves.forEach((m,i)=>acts.push({type:'move',idx:i}));
  s.team.forEach((t,i)=>{ if(i!==s.active && t.hp>0) acts.push({type:'switch',to:i}); });
  if(s.charge>=100) acts.push({type:'ult'});
  return acts;
}
export function validAction(b, side, a){
  if(!a||typeof a!=='object') return false; const s=b.sides[side];
  if(a.type==='move') return Number.isInteger(a.idx)&&a.idx>=0&&a.idx<4;
  if(a.type==='switch') return Number.isInteger(a.to)&&a.to>=0&&a.to<s.team.length&&a.to!==s.active&&s.team[a.to].hp>0;
  if(a.type==='ult') return s.charge>=100;
  return false;
}
function clampStage(v){ return Math.max(-6,Math.min(6,v)); }
const STAT_WORD={atk:'Attack',def:'Defense',spd:'Speed',acc:'Accuracy'};

export function resolveTurn(b, actions){
  const R = rng(b.seed + b.turn*7919 + 1);
  const ev = []; b.turn++;
  if(b.turn===41) ev.push({t:'sudden'});
  const order = [0,1].map(side=>{
    const a = actions[side]; let pr = 0;
    if(a.type==='switch') pr = 6; else if(a.type==='move'){ const mv = MOVES[MONSTERS[active(b,side).id].moves[a.idx]]; pr = mv.priority||0; } else if(a.type==='ult') pr = 0;
    return {side,a,pr,spd:effStat(active(b,side),'spd'),tie:R()};
  }).sort((x,y)=> y.pr-x.pr || y.spd-x.spd || y.tie-x.tie);
  for(const o of order){
    if(b.winner!==null) break;
    const side=o.side, foe=1-side, S=b.sides[side];
    let me = active(b,side);
    if(me.hp<=0) continue; // fainted before acting (replaced next)
    if(o.a.type==='switch'){
      if(!(S.team[o.a.to] && S.team[o.a.to].hp>0)) continue;
      me.stages={atk:0,def:0,spd:0,acc:0};
      ev.push({t:'switch',side,from:S.active,to:o.a.to,id:S.team[o.a.to].id});
      S.active=o.a.to; continue;
    }
    // status checks
    if(me.status==='sleep'){ if(me.sleep>0){ me.sleep--; ev.push({t:'skip',side,reason:'sleep'}); continue; } me.status=null; ev.push({t:'cure',side,status:'sleep'}); }
    if(me.status==='freeze'){ if(me.frozen>0 && R()>0.3){ me.frozen--; ev.push({t:'skip',side,reason:'freeze'}); continue; } me.status=null; me.frozen=0; ev.push({t:'cure',side,status:'freeze'}); }
    if(me.status==='paralyze' && R()<0.25){ ev.push({t:'skip',side,reason:'paralyze'}); continue; }
    let mv, ult=false;
    if(o.a.type==='ult'){ mv = ULTS[MONSTERS[me.id].type]; ult=true; S.charge=0; }
    else mv = MOVES[MONSTERS[me.id].moves[o.a.idx]];
    const moveKey = ult? 'ult' : MONSTERS[me.id].moves[o.a.idx];
    ev.push({t:'move',side,move:moveKey,name:mv.name,mtype:mv.type,fx:mv.fx,ult});
    if(ult && !me.surged){ me.surged=true; ev.push({t:'surge',side}); }
    const tgt = active(b,foe);
    const offensive = mv.power>0 || mv.effect || mv.foe;
    if(offensive && !ult){
      const acc = mv.acc * accMult(me.stages.acc) / 100;
      if(R() > acc){ ev.push({t:'miss',side,foe}); continue; }
    }
    if(mv.power>0){
      const A = effStat(me,'atk'), D = effStat(tgt,'def');
      const mult = typeMult(mv.type, MONSTERS[tgt.id].type);
      const stab = mv.type===MONSTERS[me.id].type ? 1.2 : 1;
      const crit = R() < (mv.crit?0.125:0.0625);
      let dmg = ((22*mv.power*A/D)/50 + 2) * 0.95 * (b.turn>40?1.6:1) * stab * mult * (crit?1.5:1) * (0.85+R()*0.15);
      dmg = Math.max(1, Math.floor(dmg));
      dmg = Math.min(dmg, tgt.hp);
      tgt.hp -= dmg;
      S.charge = Math.min(100, S.charge + (ult?0:Math.round(14 + dmg/tgt.maxhp*40)));
      b.sides[foe].charge = Math.min(100, b.sides[foe].charge + Math.round(dmg/tgt.maxhp*60));
      ev.push({t:'damage',side:foe,amount:dmg,hp:tgt.hp,maxhp:tgt.maxhp,eff:mult,crit});
      if(mv.drain && dmg>0){ const h=Math.min(me.maxhp-me.hp, Math.floor(dmg*mv.drain/100)); if(h>0){ me.hp+=h; ev.push({t:'heal',side,amount:h,hp:me.hp,maxhp:me.maxhp}); } }
      if(mv.foeAfter && tgt.hp>0){ for(const k in mv.foeAfter){ tgt.stages[k]=clampStage(tgt.stages[k]+mv.foeAfter[k]); ev.push({t:'stat',side:foe,stat:k,delta:mv.foeAfter[k],word:STAT_WORD[k]}); } }
    } else if(!mv.self && !mv.heal) {
      S.charge = Math.min(100, S.charge + 10);
    }
    if(mv.effect && tgt.hp>0 && !tgt.status && R()*100 < mv.effect.chance){
      const st = mv.effect.status; tgt.status = st;
      if(st==='sleep') tgt.sleep = 1 + Math.floor(R()*2);
      if(st==='freeze') tgt.frozen = 2;
      ev.push({t:'status',side:foe,status:st});
    } else if(mv.effect && mv.power===0 && tgt.status){ ev.push({t:'fail',side}); }
    if(mv.foe && tgt.hp>0){ for(const k in mv.foe){ tgt.stages[k]=clampStage(tgt.stages[k]+mv.foe[k]); ev.push({t:'stat',side:foe,stat:k,delta:mv.foe[k],word:STAT_WORD[k]}); } }
    if(mv.self){ for(const k in mv.self){ me.stages[k]=clampStage(me.stages[k]+mv.self[k]); ev.push({t:'stat',side,stat:k,delta:mv.self[k],word:STAT_WORD[k]}); } S.charge=Math.min(100,S.charge+12); }
    if(mv.heal){ const h=Math.min(me.maxhp-me.hp, Math.floor(me.maxhp*mv.heal/100/Math.pow(2,me.heals||0))); me.heals=(me.heals||0)+1; me.hp+=h; ev.push({t:'heal',side,amount:h,hp:me.hp,maxhp:me.maxhp}); if(me.status&&mv.fx==='heal'){ ev.push({t:'cure',side,status:me.status}); me.status=null; } }
    if(tgt.hp<=0){ ev.push({t:'faint',side:foe,id:tgt.id}); }
  }
  // end of turn: status damage
  for(const side of [0,1]){
    if(b.winner!==null) break;
    const f = active(b,side);
    if(f.hp>0 && (f.status==='burn'||f.status==='curse')){
      const d = Math.max(1, Math.min(f.hp, Math.floor(f.maxhp/(f.status==='burn'?12:10))));
      f.hp-=d; ev.push({t:'tick',side,status:f.status,amount:d,hp:f.hp,maxhp:f.maxhp});
      if(f.hp<=0) ev.push({t:'faint',side,id:f.id});
    }
  }
  // replacements / winner
  for(const side of [0,1]){
    const S=b.sides[side];
    if(active(b,side).hp<=0){
      const next = S.team.findIndex(t=>t.hp>0);
      if(next<0){ b.winner = 1-side; }
      else { S.active=next; ev.push({t:'switch',side,from:-1,to:next,id:S.team[next].id,forced:true}); }
    }
  }
  if(b.sides.every(s=>s.team.every(t=>t.hp<=0))) b.winner = -1;
  if(b.winner!==null) ev.push({t:'end',winner:b.winner});
  return ev;
}


// ---- CPU brains: easy / normal / hard ----
export function estDamage(b, side, mv){
  const me=active(b,side), tgt=active(b,1-side); if(!mv.power) return 0;
  const A=effStat(me,'atk'), D=effStat(tgt,'def');
  return ((22*mv.power*A/D)/50 + 2) * 0.95 * (mv.type===MONSTERS[me.id].type?1.2:1) * typeMult(mv.type, MONSTERS[tgt.id].type) * 0.925;
}
function foeThreat(b, side){ // best expected damage the foe can do to us next turn
  const foeSide=1-side, f=active(b,foeSide); let best=0;
  for(const k of MONSTERS[f.id].moves){ const mv=MOVES[k]; best=Math.max(best, estDamage(b, foeSide, mv)*(mv.acc/100)); }
  if(b.sides[foeSide].charge>=100) best=Math.max(best, estDamage(b, foeSide, ULTS[MONSTERS[f.id].type]));
  return best;
}
export function cpuAction(b, side, rand=Math.random, level='normal'){
  const S=b.sides[side], me=active(b,side), foe=active(b,1-side), fm=MONSTERS[foe.id], mm=MONSTERS[me.id];
  const moves = mm.moves.map((k,i)=>({k,i,mv:MOVES[k]}));
  if(level==='easy'){
    if(S.charge>=100 && rand()<0.5) return {type:'ult'};
    if(rand()<0.6) return {type:'move', idx:Math.floor(rand()*4)};
  }
  if(level==='hard'){
    const ult = ULTS[mm.type];
    const kills = moves.filter(o=>o.mv.power && estDamage(b,side,o.mv)*0.9 >= foe.hp).sort((a,b2)=>(b2.mv.acc-a.mv.acc)||((b2.mv.priority||0)-(a.mv.priority||0)));
    const iAmFaster = effStat(me,'spd') >= effStat(foe,'spd');
    if(kills.length && (iAmFaster || kills.some(o=>o.mv.priority))){ const pick = kills.find(o=>o.mv.priority) || kills[0]; return {type:'move', idx:pick.i}; }
    if(S.charge>=100 && estDamage(b,side,ult) >= foe.hp*0.5) return {type:'ult'};
    const threat = foeThreat(b, side);
    // switch out when the foe would likely KO us and a teammate resists
    if(threat >= me.hp && !iAmFaster){
      const opts = S.team.map((t,i)=>({t,i})).filter(o=>o.i!==S.active && o.t.hp>0).map(o=>{ const tm=MONSTERS[o.t.id]; return {...o, score: (typeMult(fm.type, tm.type)<1?2:typeMult(fm.type,tm.type)>1?-2:0) + o.t.hp/o.t.maxhp + Math.max(...tm.moves.map(k=>MOVES[k].power?typeMult(MOVES[k].type,fm.type):0))}; }).sort((a,b2)=>b2.score-a.score);
      if(opts.length && opts[0].score>1.2 && rand()<0.8) return {type:'switch', to:opts[0].i};
    }
    if(S.charge>=100) return {type:'ult'};
    let best=null, bs=-1;
    for(const o of moves){ const mv=o.mv; let sc;
      if(mv.power) sc = estDamage(b,side,mv)*(mv.acc/100) + (mv.effect&&!foe.status? mv.effect.chance*0.3:0) + (mv.drain? 8:0);
      else if(mv.heal) sc = (me.hp < me.maxhp*0.45 && (me.heals||0)<2 && threat < me.hp + me.maxhp*mv.heal/100/Math.pow(2,me.heals||0)) ? 70 : 0;
      else if(mv.effect) sc = foe.status ? 0 : (foe.hp > foe.maxhp*0.5 ? 48 : 15);
      else if(mv.self){ const k0=Object.keys(mv.self)[0]; sc = (me.stages[k0] >= 2 || threat > me.hp*0.5) ? 0 : 42; }
      else if(mv.foe) sc = foe.stages.atk <= -2 ? 0 : (threat > me.hp*0.35 ? 40 : 20);
      sc *= 0.92 + rand()*0.16;
      if(sc>bs){ bs=sc; best=o.i; } }
    return {type:'move', idx:best};
  }
  // normal
  if(S.charge>=100 && rand()<0.85) return {type:'ult'};
  const badly = typeMult(fm.type, mm.type)===2;
  if(badly && rand()<0.3){
    const opts = S.team.map((t,i)=>({t,i})).filter(o=>o.i!==S.active && o.t.hp>0 && typeMult(fm.type, MONSTERS[o.t.id].type)<2);
    if(opts.length) return {type:'switch',to:opts[Math.floor(rand()*opts.length)].i};
  }
  let best=null, bestScore=-1;
  moves.forEach(({mv,i})=>{
    let sc;
    if(mv.power>0){ sc = mv.power*(mv.acc/100)*typeMult(mv.type,fm.type)*(mv.type===mm.type?1.2:1); if(mv.priority && foe.hp < foe.maxhp*0.2) sc*=1.6; }
    else if(mv.heal){ sc = me.hp < me.maxhp*0.45 && (me.heals||0)<2 ? 95 : 5; }
    else if(mv.effect){ sc = foe.status? 0 : 55; }
    else if(mv.self){ const k0=Object.keys(mv.self)[0]; sc = me.stages[k0] >= 2 ? 0 : (me.hp > me.maxhp*0.6 ? 60 : 15); }
    else if(mv.foe){ sc = foe.stages.atk <= -2 ? 0 : 45; }
    sc *= 0.75 + rand()*0.5;
    if(sc>bestScore){ bestScore=sc; best=i; }
  });
  return {type:'move',idx:best};
}
