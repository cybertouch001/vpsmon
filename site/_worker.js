// src/engine.js
var STRONG = {
  fire: ["grass", "ice"],
  water: ["fire", "earth"],
  grass: ["water", "earth"],
  electric: ["water", "wind"],
  ice: ["grass", "wind"],
  earth: ["fire", "electric"],
  shadow: ["electric", "ice"],
  wind: ["grass", "shadow"],
  neutral: []
};
var WEAK = {
  fire: ["water", "earth"],
  water: ["grass", "water"],
  grass: ["fire", "wind"],
  electric: ["earth", "grass"],
  ice: ["fire", "water"],
  earth: ["grass", "wind"],
  shadow: ["shadow", "wind"],
  wind: ["earth", "electric"],
  neutral: []
};
function typeMult(atk, def) {
  if (STRONG[atk] && STRONG[atk].includes(def)) return 2;
  if (WEAK[atk] && WEAK[atk].includes(def)) return 0.5;
  return 1;
}
var MOVES = {
  ember_shot: { name: "Ember Shot", type: "fire", power: 45, acc: 100, fx: "fireball", effect: { status: "burn", chance: 15 } },
  inferno: { name: "Inferno Blast", type: "fire", power: 90, acc: 85, fx: "firestorm", effect: { status: "burn", chance: 25 } },
  trident: { name: "Trident Strike", type: "neutral", power: 60, acc: 100, fx: "melee", crit: 2 },
  war_cry: { name: "War Cry", type: "fire", power: 0, acc: 100, fx: "buff", self: { atk: 1 }, desc: "Attack up" },
  aqua_jet: { name: "Aqua Jet", type: "water", power: 40, acc: 100, fx: "waterjet", priority: 1 },
  tidal_crash: { name: "Tidal Crash", type: "water", power: 85, acc: 90, fx: "wave" },
  jaw_clamp: { name: "Jaw Clamp", type: "neutral", power: 65, acc: 95, fx: "melee" },
  healing_mist: { name: "Healing Mist", type: "water", power: 0, acc: 100, fx: "heal", heal: 35, desc: "Heals 35% HP" },
  needle_burst: { name: "Needle Burst", type: "grass", power: 50, acc: 100, fx: "needles" },
  vine_lash: { name: "Vine Lash", type: "grass", power: 80, acc: 90, fx: "vines" },
  sleep_spores: { name: "Sleep Spores", type: "grass", power: 0, acc: 75, fx: "spores", effect: { status: "sleep", chance: 100 }, desc: "Puts foe to sleep" },
  thorn_guard: { name: "Thorn Guard", type: "grass", power: 0, acc: 100, fx: "shield", self: { def: 2 }, desc: "Defense up a lot" },
  spark: { name: "Spark", type: "electric", power: 45, acc: 100, fx: "spark", effect: { status: "paralyze", chance: 20 } },
  storm_bolt: { name: "Storm Bolt", type: "electric", power: 90, acc: 85, fx: "lightning", effect: { status: "paralyze", chance: 15 } },
  tongue_whip: { name: "Tongue Whip", type: "neutral", power: 50, acc: 100, fx: "melee", priority: 1 },
  charge_up: { name: "Charge Up", type: "electric", power: 0, acc: 100, fx: "buff", self: { atk: 1, spd: 1 }, desc: "Attack & speed up" },
  frost_breath: { name: "Frost Breath", type: "ice", power: 50, acc: 100, fx: "frostbreath", effect: { status: "freeze", chance: 15 } },
  glacier_smash: { name: "Glacier Smash", type: "ice", power: 90, acc: 85, fx: "iceshards" },
  avalanche_punch: { name: "Avalanche Punch", type: "neutral", power: 70, acc: 95, fx: "melee" },
  snow_cloak: { name: "Snow Cloak", type: "ice", power: 0, acc: 100, fx: "shield", self: { def: 1 }, heal: 20, desc: "Defense up + heal" },
  shadow_orb: { name: "Shadow Orb", type: "shadow", power: 60, acc: 100, fx: "shadoworb" },
  nightmare: { name: "Nightmare", type: "shadow", power: 80, acc: 90, fx: "nightmare", effect: { status: "curse", chance: 30 } },
  life_drain: { name: "Life Drain", type: "shadow", power: 50, acc: 100, fx: "drain", drain: 50 },
  mind_fog: { name: "Mind Fog", type: "shadow", power: 0, acc: 90, fx: "debuff", foe: { acc: -1, atk: -1 }, desc: "Foe attack & accuracy down" },
  rock_throw: { name: "Rock Throw", type: "earth", power: 55, acc: 95, fx: "rock" },
  quake_slam: { name: "Quake Slam", type: "earth", power: 95, acc: 85, fx: "quake" },
  club_bash: { name: "Club Bash", type: "neutral", power: 65, acc: 100, fx: "melee" },
  iron_skin: { name: "Iron Skin", type: "earth", power: 0, acc: 100, fx: "shield", self: { def: 2 }, desc: "Defense up a lot" },
  gust_slash: { name: "Gust Slash", type: "wind", power: 45, acc: 100, fx: "windslash", priority: 1 },
  cyclone: { name: "Cyclone", type: "wind", power: 85, acc: 90, fx: "tornado" },
  feather_storm: { name: "Feather Storm", type: "wind", power: 60, acc: 95, fx: "feathers", foeAfter: { def: -1 } },
  tailwind: { name: "Tailwind", type: "wind", power: 0, acc: 100, fx: "buff", self: { spd: 2 }, desc: "Speed up a lot" }
};
var ULTS = {
  fire: { name: "Supernova", type: "fire", power: 130, acc: 1e3, fx: "ult_fire" },
  water: { name: "Tsunami Fang", type: "water", power: 130, acc: 1e3, fx: "ult_water" },
  grass: { name: "Forest Wrath", type: "grass", power: 130, acc: 1e3, fx: "ult_grass" },
  electric: { name: "Gigavolt Storm", type: "electric", power: 130, acc: 1e3, fx: "ult_electric" },
  ice: { name: "Absolute Zero", type: "ice", power: 130, acc: 1e3, fx: "ult_ice" },
  earth: { name: "Meteor Fall", type: "earth", power: 130, acc: 1e3, fx: "ult_earth" },
  shadow: { name: "Void Eclipse", type: "shadow", power: 130, acc: 1e3, fx: "ult_shadow" },
  wind: { name: "Sky Hurricane", type: "wind", power: 130, acc: 1e3, fx: "ult_wind" }
};
var MONSTERS = {
  blazimp: { name: "Blazimp", type: "fire", model: "blazimp", hp: 155, atk: 110, def: 86, spd: 95, moves: ["ember_shot", "inferno", "trident", "war_cry"], blurb: "A hot-headed imp that juggles fireballs with its trident." },
  tidefang: { name: "Tidefang", type: "water", model: "tidefang", hp: 170, atk: 100, def: 95, spd: 80, moves: ["aqua_jet", "tidal_crash", "jaw_clamp", "healing_mist"], blurb: "Walks out of the sea when it smells a fight." },
  pricklor: { name: "Pricklor", type: "grass", model: "pricklor", hp: 165, atk: 96, def: 105, spd: 70, moves: ["needle_burst", "vine_lash", "sleep_spores", "thorn_guard"], blurb: "A desert brawler covered in needles. Hugs are not advised." },
  zaptoad: { name: "Zaptoad", type: "electric", model: "zaptoad", hp: 145, atk: 106, def: 80, spd: 110, moves: ["spark", "storm_bolt", "tongue_whip", "charge_up"], blurb: "Stores lightning in its cheeks and croaks thunder." },
  frostbane: { name: "Frostbane", type: "ice", model: "frostbane", hp: 180, atk: 106, def: 95, spd: 60, moves: ["frost_breath", "glacier_smash", "avalanche_punch", "snow_cloak"], blurb: "A mountain giant whose breath freezes rivers." },
  voidroth: { name: "Voidroth", type: "shadow", model: "voidroth", hp: 150, atk: 108, def: 85, spd: 100, moves: ["shadow_orb", "nightmare", "life_drain", "mind_fog"], blurb: "Came from the dark between the stars. Feeds on fear." },
  grumbash: { name: "Grumbash", type: "earth", model: "grumbash", hp: 172, atk: 108, def: 106, spd: 50, moves: ["rock_throw", "quake_slam", "club_bash", "iron_skin"], blurb: "Slow, stubborn and strong enough to split boulders." },
  gustbeak: { name: "Gustbeak", type: "wind", model: "gustbeak", hp: 150, atk: 102, def: 82, spd: 115, moves: ["gust_slash", "cyclone", "feather_storm", "tailwind"], blurb: "The fastest beak in the sky. Rides the storm." }
};
var MONSTER_IDS = Object.keys(MONSTERS);
var TEAM_SIZE = 3;
function rng(seed) {
  let s = seed >>> 0 || 1;
  return function() {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}
function mkFighter(id) {
  const m = MONSTERS[id];
  return { id, hp: m.hp, maxhp: m.hp, status: null, sleep: 0, frozen: 0, heals: 0, stages: { atk: 0, def: 0, spd: 0, acc: 0 }, surged: false };
}
function validTeam(team) {
  return Array.isArray(team) && team.length === TEAM_SIZE && team.every((t) => MONSTERS[t]) && new Set(team).size === TEAM_SIZE;
}
function createBattle(p1team, p2team, seed) {
  return { turn: 0, seed: seed >>> 0 || 12345, sides: [0, 1].map((i) => ({ team: (i ? p2team : p1team).map(mkFighter), active: 0, charge: 0 })), winner: null };
}
function stageMult(s) {
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}
function accMult(s) {
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}
function active(b, side) {
  return b.sides[side].team[b.sides[side].active];
}
function effStat(f, stat) {
  const m = MONSTERS[f.id];
  let v = m[stat] * stageMult(f.stages[stat]);
  if (stat === "spd" && f.status === "paralyze") v *= 0.5;
  if (stat === "atk" && f.surged) v *= 1.2;
  return v;
}
function validAction(b, side, a) {
  if (!a || typeof a !== "object") return false;
  const s = b.sides[side];
  if (a.type === "move") return Number.isInteger(a.idx) && a.idx >= 0 && a.idx < 4;
  if (a.type === "switch") return Number.isInteger(a.to) && a.to >= 0 && a.to < s.team.length && a.to !== s.active && s.team[a.to].hp > 0;
  if (a.type === "ult") return s.charge >= 100;
  return false;
}
function clampStage(v) {
  return Math.max(-6, Math.min(6, v));
}
var STAT_WORD = { atk: "Attack", def: "Defense", spd: "Speed", acc: "Accuracy" };
function resolveTurn(b, actions) {
  const R = rng(b.seed + b.turn * 7919 + 1);
  const ev = [];
  b.turn++;
  if (b.turn === 41) ev.push({ t: "sudden" });
  const order = [0, 1].map((side) => {
    const a = actions[side];
    let pr = 0;
    if (a.type === "switch") pr = 6;
    else if (a.type === "move") {
      const mv = MOVES[MONSTERS[active(b, side).id].moves[a.idx]];
      pr = mv.priority || 0;
    } else if (a.type === "ult") pr = 0;
    return { side, a, pr, spd: effStat(active(b, side), "spd"), tie: R() };
  }).sort((x, y) => y.pr - x.pr || y.spd - x.spd || y.tie - x.tie);
  for (const o of order) {
    if (b.winner !== null) break;
    const side = o.side, foe = 1 - side, S = b.sides[side];
    let me = active(b, side);
    if (me.hp <= 0) continue;
    if (o.a.type === "switch") {
      if (!(S.team[o.a.to] && S.team[o.a.to].hp > 0)) continue;
      me.stages = { atk: 0, def: 0, spd: 0, acc: 0 };
      ev.push({ t: "switch", side, from: S.active, to: o.a.to, id: S.team[o.a.to].id });
      S.active = o.a.to;
      continue;
    }
    if (me.status === "sleep") {
      if (me.sleep > 0) {
        me.sleep--;
        ev.push({ t: "skip", side, reason: "sleep" });
        continue;
      }
      me.status = null;
      ev.push({ t: "cure", side, status: "sleep" });
    }
    if (me.status === "freeze") {
      if (me.frozen > 0 && R() > 0.3) {
        me.frozen--;
        ev.push({ t: "skip", side, reason: "freeze" });
        continue;
      }
      me.status = null;
      me.frozen = 0;
      ev.push({ t: "cure", side, status: "freeze" });
    }
    if (me.status === "paralyze" && R() < 0.25) {
      ev.push({ t: "skip", side, reason: "paralyze" });
      continue;
    }
    let mv, ult = false;
    if (o.a.type === "ult") {
      mv = ULTS[MONSTERS[me.id].type];
      ult = true;
      S.charge = 0;
    } else mv = MOVES[MONSTERS[me.id].moves[o.a.idx]];
    const moveKey = ult ? "ult" : MONSTERS[me.id].moves[o.a.idx];
    ev.push({ t: "move", side, move: moveKey, name: mv.name, mtype: mv.type, fx: mv.fx, ult });
    if (ult && !me.surged) {
      me.surged = true;
      ev.push({ t: "surge", side });
    }
    const tgt = active(b, foe);
    const offensive = mv.power > 0 || mv.effect || mv.foe;
    if (offensive && !ult) {
      const acc = mv.acc * accMult(me.stages.acc) / 100;
      if (R() > acc) {
        ev.push({ t: "miss", side, foe });
        continue;
      }
    }
    if (mv.power > 0) {
      const A = effStat(me, "atk"), D = effStat(tgt, "def");
      const mult = typeMult(mv.type, MONSTERS[tgt.id].type);
      const stab = mv.type === MONSTERS[me.id].type ? 1.2 : 1;
      const crit = R() < (mv.crit ? 0.125 : 0.0625);
      let dmg = (22 * mv.power * A / D / 50 + 2) * 0.95 * (b.turn > 40 ? 1.6 : 1) * stab * mult * (crit ? 1.5 : 1) * (0.85 + R() * 0.15);
      dmg = Math.max(1, Math.floor(dmg));
      dmg = Math.min(dmg, tgt.hp);
      tgt.hp -= dmg;
      S.charge = Math.min(100, S.charge + (ult ? 0 : Math.round(14 + dmg / tgt.maxhp * 40)));
      b.sides[foe].charge = Math.min(100, b.sides[foe].charge + Math.round(dmg / tgt.maxhp * 60));
      ev.push({ t: "damage", side: foe, amount: dmg, hp: tgt.hp, maxhp: tgt.maxhp, eff: mult, crit });
      if (mv.drain && dmg > 0) {
        const h = Math.min(me.maxhp - me.hp, Math.floor(dmg * mv.drain / 100));
        if (h > 0) {
          me.hp += h;
          ev.push({ t: "heal", side, amount: h, hp: me.hp, maxhp: me.maxhp });
        }
      }
      if (mv.foeAfter && tgt.hp > 0) {
        for (const k in mv.foeAfter) {
          tgt.stages[k] = clampStage(tgt.stages[k] + mv.foeAfter[k]);
          ev.push({ t: "stat", side: foe, stat: k, delta: mv.foeAfter[k], word: STAT_WORD[k] });
        }
      }
    } else if (!mv.self && !mv.heal) {
      S.charge = Math.min(100, S.charge + 10);
    }
    if (mv.effect && tgt.hp > 0 && !tgt.status && R() * 100 < mv.effect.chance) {
      const st = mv.effect.status;
      tgt.status = st;
      if (st === "sleep") tgt.sleep = 1 + Math.floor(R() * 2);
      if (st === "freeze") tgt.frozen = 2;
      ev.push({ t: "status", side: foe, status: st });
    } else if (mv.effect && mv.power === 0 && tgt.status) {
      ev.push({ t: "fail", side });
    }
    if (mv.foe && tgt.hp > 0) {
      for (const k in mv.foe) {
        tgt.stages[k] = clampStage(tgt.stages[k] + mv.foe[k]);
        ev.push({ t: "stat", side: foe, stat: k, delta: mv.foe[k], word: STAT_WORD[k] });
      }
    }
    if (mv.self) {
      for (const k in mv.self) {
        me.stages[k] = clampStage(me.stages[k] + mv.self[k]);
        ev.push({ t: "stat", side, stat: k, delta: mv.self[k], word: STAT_WORD[k] });
      }
      S.charge = Math.min(100, S.charge + 12);
    }
    if (mv.heal) {
      const h = Math.min(me.maxhp - me.hp, Math.floor(me.maxhp * mv.heal / 100 / Math.pow(2, me.heals || 0)));
      me.heals = (me.heals || 0) + 1;
      me.hp += h;
      ev.push({ t: "heal", side, amount: h, hp: me.hp, maxhp: me.maxhp });
      if (me.status && mv.fx === "heal") {
        ev.push({ t: "cure", side, status: me.status });
        me.status = null;
      }
    }
    if (tgt.hp <= 0) {
      ev.push({ t: "faint", side: foe, id: tgt.id });
    }
  }
  for (const side of [0, 1]) {
    if (b.winner !== null) break;
    const f = active(b, side);
    if (f.hp > 0 && (f.status === "burn" || f.status === "curse")) {
      const d = Math.max(1, Math.min(f.hp, Math.floor(f.maxhp / (f.status === "burn" ? 12 : 10))));
      f.hp -= d;
      ev.push({ t: "tick", side, status: f.status, amount: d, hp: f.hp, maxhp: f.maxhp });
      if (f.hp <= 0) ev.push({ t: "faint", side, id: f.id });
    }
  }
  for (const side of [0, 1]) {
    const S = b.sides[side];
    if (active(b, side).hp <= 0) {
      const next = S.team.findIndex((t) => t.hp > 0);
      if (next < 0) {
        b.winner = 1 - side;
      } else {
        S.active = next;
        ev.push({ t: "switch", side, from: -1, to: next, id: S.team[next].id, forced: true });
      }
    }
  }
  if (b.sides.every((s) => s.team.every((t) => t.hp <= 0))) b.winner = -1;
  if (b.winner !== null) ev.push({ t: "end", winner: b.winner });
  return ev;
}
function estDamage(b, side, mv) {
  const me = active(b, side), tgt = active(b, 1 - side);
  if (!mv.power) return 0;
  const A = effStat(me, "atk"), D = effStat(tgt, "def");
  return (22 * mv.power * A / D / 50 + 2) * 0.95 * (mv.type === MONSTERS[me.id].type ? 1.2 : 1) * typeMult(mv.type, MONSTERS[tgt.id].type) * 0.925;
}
function foeThreat(b, side) {
  const foeSide = 1 - side, f = active(b, foeSide);
  let best = 0;
  for (const k of MONSTERS[f.id].moves) {
    const mv = MOVES[k];
    best = Math.max(best, estDamage(b, foeSide, mv) * (mv.acc / 100));
  }
  if (b.sides[foeSide].charge >= 100) best = Math.max(best, estDamage(b, foeSide, ULTS[MONSTERS[f.id].type]));
  return best;
}
function cpuAction(b, side, rand = Math.random, level = "normal") {
  const S = b.sides[side], me = active(b, side), foe = active(b, 1 - side), fm = MONSTERS[foe.id], mm = MONSTERS[me.id];
  const moves = mm.moves.map((k, i) => ({ k, i, mv: MOVES[k] }));
  if (level === "easy") {
    if (S.charge >= 100 && rand() < 0.5) return { type: "ult" };
    if (rand() < 0.6) return { type: "move", idx: Math.floor(rand() * 4) };
  }
  if (level === "hard") {
    const ult = ULTS[mm.type];
    const kills = moves.filter((o) => o.mv.power && estDamage(b, side, o.mv) * 0.9 >= foe.hp).sort((a, b2) => b2.mv.acc - a.mv.acc || (b2.mv.priority || 0) - (a.mv.priority || 0));
    const iAmFaster = effStat(me, "spd") >= effStat(foe, "spd");
    if (kills.length && (iAmFaster || kills.some((o) => o.mv.priority))) {
      const pick = kills.find((o) => o.mv.priority) || kills[0];
      return { type: "move", idx: pick.i };
    }
    if (S.charge >= 100 && estDamage(b, side, ult) >= foe.hp * 0.5) return { type: "ult" };
    const threat = foeThreat(b, side);
    if (threat >= me.hp && !iAmFaster) {
      const opts = S.team.map((t, i) => ({ t, i })).filter((o) => o.i !== S.active && o.t.hp > 0).map((o) => {
        const tm = MONSTERS[o.t.id];
        return { ...o, score: (typeMult(fm.type, tm.type) < 1 ? 2 : typeMult(fm.type, tm.type) > 1 ? -2 : 0) + o.t.hp / o.t.maxhp + Math.max(...tm.moves.map((k) => MOVES[k].power ? typeMult(MOVES[k].type, fm.type) : 0)) };
      }).sort((a, b2) => b2.score - a.score);
      if (opts.length && opts[0].score > 1.2 && rand() < 0.8) return { type: "switch", to: opts[0].i };
    }
    if (S.charge >= 100) return { type: "ult" };
    let best2 = null, bs = -1;
    for (const o of moves) {
      const mv = o.mv;
      let sc;
      if (mv.power) sc = estDamage(b, side, mv) * (mv.acc / 100) + (mv.effect && !foe.status ? mv.effect.chance * 0.3 : 0) + (mv.drain ? 8 : 0);
      else if (mv.heal) sc = me.hp < me.maxhp * 0.45 && (me.heals || 0) < 2 && threat < me.hp + me.maxhp * mv.heal / 100 / Math.pow(2, me.heals || 0) ? 70 : 0;
      else if (mv.effect) sc = foe.status ? 0 : foe.hp > foe.maxhp * 0.5 ? 48 : 15;
      else if (mv.self) {
        const k0 = Object.keys(mv.self)[0];
        sc = me.stages[k0] >= 2 || threat > me.hp * 0.5 ? 0 : 42;
      } else if (mv.foe) sc = foe.stages.atk <= -2 ? 0 : threat > me.hp * 0.35 ? 40 : 20;
      sc *= 0.92 + rand() * 0.16;
      if (sc > bs) {
        bs = sc;
        best2 = o.i;
      }
    }
    return { type: "move", idx: best2 };
  }
  if (S.charge >= 100 && rand() < 0.85) return { type: "ult" };
  const badly = typeMult(fm.type, mm.type) === 2;
  if (badly && rand() < 0.3) {
    const opts = S.team.map((t, i) => ({ t, i })).filter((o) => o.i !== S.active && o.t.hp > 0 && typeMult(fm.type, MONSTERS[o.t.id].type) < 2);
    if (opts.length) return { type: "switch", to: opts[Math.floor(rand() * opts.length)].i };
  }
  let best = null, bestScore = -1;
  moves.forEach(({ mv, i }) => {
    let sc;
    if (mv.power > 0) {
      sc = mv.power * (mv.acc / 100) * typeMult(mv.type, fm.type) * (mv.type === mm.type ? 1.2 : 1);
      if (mv.priority && foe.hp < foe.maxhp * 0.2) sc *= 1.6;
    } else if (mv.heal) {
      sc = me.hp < me.maxhp * 0.45 && (me.heals || 0) < 2 ? 95 : 5;
    } else if (mv.effect) {
      sc = foe.status ? 0 : 55;
    } else if (mv.self) {
      const k0 = Object.keys(mv.self)[0];
      sc = me.stages[k0] >= 2 ? 0 : me.hp > me.maxhp * 0.6 ? 60 : 15;
    } else if (mv.foe) {
      sc = foe.stages.atk <= -2 ? 0 : 45;
    }
    sc *= 0.75 + rand() * 0.5;
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return { type: "move", idx: best };
}

// src/worker.js
var ROOM_TTL_MS = 3 * 3600 * 1e3;
var TURN_LIMIT_MS = 45e3;
var J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" } });
var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code() {
  let s = "";
  const a = new Uint8Array(5);
  crypto.getRandomValues(a);
  for (const x of a) s += CODE_CHARS[x % CODE_CHARS.length];
  return s;
}
function token() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function clean(s, n) {
  return String(s || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, n);
}
var schemaReady = false;
async function schema(db) {
  if (schemaReady) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, ver INTEGER NOT NULL, created INTEGER, updated INTEGER, state TEXT, photo0 TEXT, photo1 TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS mm (code TEXT PRIMARY KEY, created INTEGER)`).run();
  schemaReady = true;
}
async function load(db, c) {
  return await db.prepare("SELECT code, ver, state, updated FROM rooms WHERE code=?").bind(c).first();
}
async function save(db, c, ver, st) {
  const r = await db.prepare("UPDATE rooms SET state=?, ver=ver+1, updated=? WHERE code=? AND ver=?").bind(JSON.stringify(st), Date.now(), c, ver).run();
  return r.meta && r.meta.changes === 1;
}
function seatOf(st, tok) {
  if (!tok) return -1;
  return st.players.findIndex((p) => p && p.token === tok);
}
function publicView(st, seat, ver) {
  const now = Date.now();
  return {
    ver,
    you: seat,
    status: st.status,
    arena: st.arena,
    players: st.players.map((p, i) => p ? { name: p.name, team: p.team, hasPhoto: !!p.hasPhoto, photoRev: p.photoRev || 0, online: now - (p.seen || 0) < 12e3, ready: st.pending && st.pending[i] != null } : null),
    battle: st.battle,
    log: st.log.slice(-6),
    deadline: st.deadline || 0,
    now,
    emotes: st.emotes.slice(-8),
    rematch: st.rematch,
    round: st.round || 1
  };
}
function startBattle(st) {
  const seed = Math.random() * 4294967295 >>> 0;
  st.battle = createBattle(st.players[0].team, st.players[1].team, seed);
  st.status = "battle";
  st.pending = [null, null];
  st.log = [];
  st.deadline = Date.now() + TURN_LIMIT_MS;
  st.rematch = [false, false];
}
function maybeResolve(st, force) {
  if (st.status !== "battle" || !st.battle || st.battle.winner !== null) return false;
  const p = st.pending;
  if (force) {
    for (const i of [0, 1]) if (p[i] == null) p[i] = cpuAction(st.battle, i);
  }
  if (p[0] == null || p[1] == null) return false;
  const events = resolveTurn(st.battle, [p[0], p[1]]);
  st.log.push({ turn: st.battle.turn, actions: [p[0], p[1]], events });
  if (st.log.length > 12) st.log = st.log.slice(-12);
  st.pending = [null, null];
  if (st.battle.winner !== null) {
    st.status = "over";
    st.deadline = 0;
  } else st.deadline = Date.now() + TURN_LIMIT_MS + 4e3;
  return true;
}
async function createRoom(db, body, quick) {
  const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/") && body.photo.length < 12e4 ? body.photo : null;
  const arena = ["meadow", "canyon", "snow", "city"].includes(body.arena) ? body.arena : ["meadow", "canyon", "snow", "city"][Math.floor(Math.random() * 4)];
  await db.prepare("DELETE FROM rooms WHERE updated < ?").bind(Date.now() - ROOM_TTL_MS).run();
  for (let tries = 0; tries < 5; tries++) {
    const c = code(), tok = token(), now = Date.now();
    const st = { status: "waiting", quick: !!quick, arena, players: [{ name: clean(body.name, 16) || "Player 1", token: tok, team: body.team, hasPhoto: !!photo, photoRev: 1, seen: now }, null], pending: [null, null], battle: null, log: [], emotes: [], rematch: [false, false], round: 1 };
    try {
      await db.prepare("INSERT INTO rooms (code, ver, created, updated, state, photo0) VALUES (?,?,?,?,?,?)").bind(c, 1, now, now, JSON.stringify(st), photo).run();
      return { ok: true, code: c, token: tok };
    } catch (e) {
    }
  }
  return { ok: false, error: "Could not create a room, try again" };
}
async function joinRoom(db, c, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await load(db, c);
    if (!row) return { ok: false, error: "Room not found. Check the code.", status: 404 };
    const st = JSON.parse(row.state);
    if (st.players[1]) return { ok: false, error: "This room is already full", status: 409 };
    if (!validTeam(body.team)) return { ok: false, error: "Pick 3 different monsters", status: 400 };
    const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/") && body.photo.length < 12e4 ? body.photo : null;
    const ntok = token();
    st.players[1] = { name: clean(body.name, 16) || "Player 2", token: ntok, team: body.team, hasPhoto: !!photo, photoRev: 1, seen: Date.now() };
    startBattle(st);
    const r = await db.prepare("UPDATE rooms SET state=?, ver=ver+1, updated=?, photo1=? WHERE code=? AND ver=?").bind(JSON.stringify(st), Date.now(), photo, c, row.ver).run();
    if (r.meta.changes === 1) return { ok: true, token: ntok };
  }
  return { ok: false, error: "Busy, try again", status: 503 };
}
async function api(req, env, url) {
  const db = env.DB;
  await schema(db);
  const path = url.pathname.slice(5);
  let body = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch (e) {
      return J({ error: "bad json" }, 400);
    }
  }
  const q = (k) => body[k] !== void 0 ? body[k] : url.searchParams.get(k);
  if (path === "health") return J({ ok: true, game: "VPSmon", v: 2 });
  if (path === "quick") {
    const team = body.team;
    if (!validTeam(team)) return J({ error: "Pick 3 different monsters" }, 400);
    for (let k = 0; k < 4; k++) {
      const w0 = await db.prepare("SELECT code FROM mm WHERE created > ? ORDER BY created LIMIT 1").bind(Date.now() - 2e4).first();
      if (!w0) break;
      const del = await db.prepare("DELETE FROM mm WHERE code=?").bind(w0.code).run();
      if (del.meta.changes !== 1) continue;
      const jr = await joinRoom(db, w0.code, body);
      if (jr.ok) return J({ code: w0.code, token: jr.token, seat: 1, matched: true });
    }
    await db.prepare("DELETE FROM mm WHERE created < ?").bind(Date.now() - 6e4).run();
    const cr = await createRoom(db, body, true);
    if (!cr.ok) return J({ error: cr.error }, 500);
    await db.prepare("INSERT INTO mm (code, created) VALUES (?,?)").bind(cr.code, Date.now()).run();
    return J({ code: cr.code, token: cr.token, seat: 0, matched: false });
  }
  if (path === "quick_cancel") {
    const c2 = clean(body.code, 8).toUpperCase();
    const row = await load(db, c2);
    if (!row) return J({ cancelled: true });
    const st = JSON.parse(row.state);
    if (seatOf(st, body.token) !== 0) return J({ error: "Not your room" }, 403);
    const del = await db.prepare("DELETE FROM mm WHERE code=?").bind(c2).run();
    if (del.meta.changes === 1 && st.status === "waiting") {
      await db.prepare("DELETE FROM rooms WHERE code=? AND ver=?").bind(c2, row.ver).run();
      return J({ cancelled: true });
    }
    return J({ cancelled: false, status: st.status });
  }
  if (path === "create") {
    const team = body.team;
    if (!validTeam(team)) return J({ error: "Pick 3 different monsters" }, 400);
    const cr = await createRoom(db, body, false);
    if (!cr.ok) return J({ error: cr.error }, 500);
    return J({ code: cr.code, token: cr.token, seat: 0 });
  }
  const c = clean(q("code"), 8).toUpperCase();
  if (!c) return J({ error: "Room code missing" }, 400);
  if (path === "peek") {
    const row = await load(db, c);
    if (!row) return J({ exists: false });
    const st = JSON.parse(row.state);
    return J({ exists: true, full: !!st.players[1], status: st.status });
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await load(db, c);
    if (!row) return J({ error: "Room not found. Check the code." }, 404);
    const st = JSON.parse(row.state);
    const tok = q("token");
    let seat = seatOf(st, tok);
    if (path === "join") {
      if (seat >= 0) return J({ code: c, token: tok, seat });
      const jr = await joinRoom(db, c, body);
      if (!jr.ok) return J({ error: jr.error }, jr.status || 500);
      return J({ code: c, token: jr.token, seat: 1 });
    }
    if (seat < 0) return J({ error: "Not a player in this room" }, 403);
    if (path === "photo") {
      const s = Number(q("seat")) === 1 ? 1 : 0;
      const pr = await db.prepare(`SELECT photo${s} AS p FROM rooms WHERE code=?`).bind(c).first();
      return J({ photo: pr ? pr.p : null });
    }
    if (path === "state") {
      const since = Number(q("v") || 0);
      let changed = false;
      const now = Date.now();
      if (now - (st.players[seat].seen || 0) > 4e3) {
        st.players[seat].seen = now;
        changed = true;
      }
      if (st.status === "battle" && st.deadline && now > st.deadline && (st.pending[0] != null || st.pending[1] != null || now > st.deadline + 3e4)) {
        if (maybeResolve(st, true)) changed = true;
      }
      if (changed) {
        if (!await save(db, c, row.ver, st)) continue;
        return J(publicView(st, seat, row.ver + 1));
      }
      if (since === row.ver) return J({ same: true, ver: row.ver, now });
      return J(publicView(st, seat, row.ver));
    }
    if (path === "act") {
      if (st.status !== "battle") return J({ error: "No battle running" }, 409);
      if (Number(q("turn")) !== st.battle.turn) return J({ error: "stale turn", ver: row.ver }, 409);
      const a = body.action;
      if (!validAction(st.battle, seat, a)) return J({ error: "Invalid action" }, 400);
      st.pending[seat] = a;
      st.players[seat].seen = Date.now();
      maybeResolve(st, false);
      if (!await save(db, c, row.ver, st)) continue;
      return J({ ok: true, ver: row.ver + 1 });
    }
    if (path === "emote") {
      const e = clean(body.emote, 24);
      if (!e) return J({ error: "empty" }, 400);
      st.emotes.push({ id: st.emotes.length ? st.emotes[st.emotes.length - 1].id + 1 : 1, seat, e, at: Date.now() });
      if (st.emotes.length > 10) st.emotes = st.emotes.slice(-10);
      if (!await save(db, c, row.ver, st)) continue;
      return J({ ok: true });
    }
    if (path === "rematch") {
      if (st.status !== "over") return J({ error: "Battle not over" }, 409);
      st.rematch[seat] = true;
      if (st.rematch[0] && st.rematch[1]) {
        st.round = (st.round || 1) + 1;
        startBattle(st);
      }
      if (!await save(db, c, row.ver, st)) continue;
      return J({ ok: true });
    }
    if (path === "leave") {
      st.players[seat].left = true;
      st.players[seat].seen = 0;
      if (st.status === "battle") {
        st.status = "over";
        st.battle.winner = 1 - seat;
        st.forfeit = seat;
        st.log.push({ turn: st.battle.turn + 1, events: [{ t: "forfeit", side: seat }, { t: "end", winner: 1 - seat }] });
      }
      const bothGone = st.players.every((p) => !p || p.left);
      if (bothGone) {
        await db.prepare("DELETE FROM rooms WHERE code=?").bind(c).run();
        return J({ ok: true, deleted: true });
      }
      const r = await db.prepare(`UPDATE rooms SET state=?, ver=ver+1, updated=?, photo${seat}=NULL WHERE code=? AND ver=?`).bind(JSON.stringify(st), Date.now(), c, row.ver).run();
      if (r.meta.changes !== 1) continue;
      return J({ ok: true });
    }
    return J({ error: "unknown endpoint" }, 404);
  }
  return J({ error: "Busy, try again" }, 503);
}
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST" } });
      try {
        return await api(req, env, url);
      } catch (e) {
        return J({ error: "Server error", detail: String(e && e.message || e) }, 500);
      }
    }
    if (url.pathname === "/download/FaceFang-Arena.apk") return Response.redirect(url.origin + "/download/VPSmon.apk", 301);
    const res = await env.ASSETS.fetch(req);
    if (url.pathname.endsWith(".apk") && res.ok) {
      const h = new Headers(res.headers);
      h.set("content-type", "application/vnd.android.package-archive");
      h.set("content-disposition", 'attachment; filename="VPSmon.apk"');
      return new Response(res.body, { status: 200, headers: h });
    }
    if (/\.(glb|jpg|woff2|png)$/.test(url.pathname) && res.ok) {
      const h = new Headers(res.headers);
      h.set("cache-control", "public, max-age=604800");
      return new Response(res.body, { status: res.status, headers: h });
    }
    return res;
  }
};
export {
  worker_default as default
};
