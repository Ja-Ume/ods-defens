'use strict';
/* =========================================================
   ODS DEFENDERS — motor del juego e interfaz
   ========================================================= */
const BASE = 60;
const ADDK = new Set(['dmg','range','pierce','shots','fan','splashR','splashD','chain','bounces','blades','blades2','orbitR','cash','life','interest','icap','discount','cashPop','mines','mineR','aRng','aWeak','aR','cone','knock','cluster','rcash']);
const MULK = new Set(['rate','pspeed','cashInt','aRate','spin','hitCd']);
const AIMED = new Set(['shot','boom','bomb','bounce','sniper','chain','spray']);
const ECOL = { bolsa:'#e8f4ff', colilla:'#e8a33d', botella:'#64b5f6', lata:'#cfd8dc', humo:'#90a4ae', barril:'#37474f', micro:'#b3e5fc', plomo:'#9ccc65', tala:'#8d6e63',
  smog:'#7e57c2', corrup:'#a1887f', fake:'#f5f0e1', fabrica:'#78909c', petro:'#283593', clima:'#ff6d00' };
const LADDER = [['bolsa',1],['colilla',3],['botella',6],['lata',10],['humo',14],['barril',18],['micro',20],['plomo',23],['tala',27],['smog',31],['corrup',36]];

let PROF = { xp: 0, medals: {}, snd: true };
try { const s = localStorage.getItem('odsd_prof'); if (s) PROF = Object.assign(PROF, JSON.parse(s)); } catch (e) {}
function saveProf() { try { localStorage.setItem('odsd_prof', JSON.stringify(PROF)); } catch (e) {} }
const S = { map: 0, diff: 1, mode: 0, hero: 0 };
let G = null, built = null, bgCan = null, cv = null, ctx = null, TID = 0, EID = 0;
const PREV = {};

/* ---------- Sonido ---------- */
let AC = null; const SL = {};
function sfx(k) {
  if (!PROF.snd) return;
  try {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; AC = new C(); }
    if (AC.state === 'suspended') AC.resume();
    const now = AC.currentTime, gap = k === 'pop' ? .055 : k === 'shoot' ? .07 : .03;
    if (now - (SL[k] || 0) < gap) return; SL[k] = now;
    const o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
    let f = 400, d = .08, v = .04, ty = 'sine', f2 = 0;
    if (k === 'pop') { f = 520 + Math.random() * 300; f2 = f * .6; d = .06; v = .035; }
    else if (k === 'shoot') { f = 260; f2 = 200; d = .05; v = .012; ty = 'triangle'; }
    else if (k === 'place') { f = 300; f2 = 560; d = .12; v = .06; ty = 'square'; }
    else if (k === 'up') { f = 440; f2 = 880; d = .18; v = .06; ty = 'triangle'; }
    else if (k === 'coin') { f = 880; f2 = 1320; d = .1; v = .04; ty = 'triangle'; }
    else if (k === 'boom') { f = 120; f2 = 50; d = .2; v = .08; ty = 'sawtooth'; }
    else if (k === 'ab') { f = 200; f2 = 900; d = .4; v = .07; ty = 'sawtooth'; }
    else if (k === 'leak') { f = 160; f2 = 90; d = .25; v = .08; ty = 'square'; }
    else if (k === 'snipe') { f = 700; f2 = 150; d = .12; v = .06; ty = 'square'; }
    else if (k === 'boss') { f = 90; f2 = 60; d = .7; v = .1; ty = 'sawtooth'; }
    else if (k === 'win') { f = 523; f2 = 1046; d = .6; v = .07; ty = 'triangle'; }
    o.type = ty; o.frequency.setValueAtTime(f, now); if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + d);
    g.gain.setValueAtTime(v, now); g.gain.exponentialRampToValueAtTime(.0001, now + d); o.start(now); o.stop(now + d + .02);
  } catch (e) {}
}

/* ---------- Oleadas ---------- */
function hpMul(r) { return r <= 80 ? 1 : 1 + (r - 80) * .06; }
function genRound(r) {
  const R = mulberry32(r * 7919 + 17), groups = [];
  const avail = LADDER.filter((l) => l[1] <= r).map((l) => l[0]), hi = avail.length - 1;
  const camoF = r >= 20 ? (r >= 40 ? .4 : .3) : 0, regP = r >= 24 ? .35 : 0, fortP = r >= 36 ? .3 : 0;
  const bossList = [];
  if (r >= 26 && (r % 6 === 2 || (r >= 50 && r % 3 === 2))) bossList.push(['fabrica', 1 + Math.floor((r - 26) / 18)]);
  if (r >= 40 && r % 10 === 0) bossList.push(['petro', 1 + Math.floor((r - 40) / 20)]);
  if (r >= 60 && r % 20 === 0) bossList.push(['clima', 1 + Math.floor((r - 60) / 40)]);
  if (r >= 33 && r % 5 === 3) bossList.push(['fake', 1 + Math.floor(r / 30)]);
  const B = (12 + 1.8 * Math.pow(r, 1.55)) * (bossList.length ? .5 : 1) * (r > 100 ? 1 + (r - 100) * .03 : 1);
  const main = avail[Math.max(0, hi - Math.floor(R() * Math.min(2, avail.length)))];
  const other = avail[Math.max(0, hi - 1 - Math.floor(R() * Math.min(3, avail.length)))];
  const gapOf = (t) => Math.max(.1, .6 / Math.pow(E[t].spd, .55));
  const add = (type, count, start, gap, camoOK) => {
    count = Math.max(1, Math.min(60, Math.round(count)));
    const gp = gap || gapOf(type), boss = E[type].boss;
    const reg = CHAIN.indexOf(type) >= 0 && R() < regP, fort = !boss && R() < fortP;
    let dur = 0;
    if (camoOK && !boss && camoF > 0 && R() < .6) {
      const cn = Math.max(1, Math.ceil(count * camoF)), nn = count - cn;
      if (nn > 0) groups.push({ type, count: nn, gap: gp, start, camo: false, regrow: reg, fort });
      groups.push({ type, count: cn, gap: gp, start: start + nn * gp * .4, camo: true, regrow: reg, fort });
      dur = count * gp;
    } else {
      groups.push({ type, count, gap: gp, start, camo: type === 'fake', regrow: reg, fort });
      dur = count * gp;
    }
    return dur;
  };
  const d1 = add(main, B * .62 / E[main].rbe, 0, 0, true);
  let d2 = 0;
  if (other !== main || r < 3) d2 = add(other, B * .38 / E[other].rbe, d1 * .5 + 1, 0, true);
  let t0 = Math.max(d1, d1 * .5 + 1 + d2) * .5 + 2;
  for (const [t, n] of bossList) { add(t, n, t0, t === 'fake' ? .8 : 3, false); t0 += 3.5; }
  return groups;
}

/* ---------- Estado de partida ---------- */
function newGame() {
  const def = MAPS[S.map], diff = DIFFS[S.diff], mode = MODES[S.mode];
  built = buildMap(def, mode.id === 'rev');
  bgCan = renderBG(def, built);
  const starts = [], goals = [];
  for (const p of built.paths) {
    starts.push(posOn(p, 36));
    let gi = p.n - 1;
    while (gi > 0 && (p.pts[gi][0] > W - 14 || p.pts[gi][0] < 14 || p.pts[gi][1] > H - 14 || p.pts[gi][1] < 14)) gi--;
    goals.push([p.pts[gi][0], p.pts[gi][1]]);
  }
  G = { def, diff, mode, paths: built.paths, round: 0, maxRound: diff.rounds, lives: diff.lives, money: mode.id === 'sand' ? 99999 : diff.cash,
    en: [], tw: [], pr: [], mines: [], fx: [], q: [], qt: 0, waveOn: false, time: 0, speed: 1, paused: false, over: false, free: false, auto: false, autoT: 0,
    sel: null, placing: null, mouse: { x: 0, y: 0, in: false }, boost: { t: 0, m: 1 }, powers: {}, hero: null, rewMul: mode.id === 'half' ? .5 : 1,
    pops: 0, discount: 0, banner: null, spawnN: 0, amb: makeAmbient(def.theme), abDirty: true, starts, goals, seen: {}, flash: 0, leaked: 0, tick: 0, startLivesWarn: diff.lives * .2, heroStartLv: 0, seenCamo: false };
  for (const p of POWERS) G.powers[p.id] = p.count;
  return G;
}
const costOf = (c) => Math.max(5, Math.round(c * G.diff.cost * (1 - G.discount) / 5) * 5);

function recalc(t) {
  const d = t.def, s = JSON.parse(JSON.stringify(d.base)); s.abs = [];
  const apply = (m) => {
    for (const k in m) {
      const v = m[k];
      if (k === 'ability') { s.abs = s.abs.filter((a) => a.id !== v.id); s.abs.push(v); }
      else if (k === 'bonus') { s.bonus = s.bonus || {}; for (const tg in v) s.bonus[tg] = Math.max(s.bonus[tg] || 0, v[tg]); }
      else if (MULK.has(k)) s[k] = (s[k] === undefined ? 1 : s[k]) * v;
      else if (ADDK.has(k)) s[k] = (s[k] || 0) + v;
      else s[k] = v;
    }
  };
  if (t.hero) { for (let l = 2; l <= t.lvl; l++) if (d.lv[l]) apply(d.lv[l]); }
  else for (let p = 0; p < 3; p++) for (let i = 0; i < t.tiers[p]; i++) apply(d.paths[p].u[i].m);
  t.s = s;
  const fx = {}; for (const k of ['slowF','slowT','freezeT','stunT','knock','weak','weakT','burn','burnT','bonus','crit']) if (s[k] !== undefined) fx[k] = s[k];
  t.fx = fx;
}
function addTower(def, x, y, isHero) {
  const t = { id: ++TID, def, x, y, tiers: [0, 0, 0], s: null, fx: null, cd: .2, ang: -Math.PI / 2, mode: 'first', spent: 0, hero: !!isHero, lvl: 1, mines: 0, ob: 0, cashT: 0, abT: {}, fire: 0, bf: { r: 1, rg: 0, d: 0, det: false }, e: null, bpos: [] };
  recalc(t); G.tw.push(t); G.abDirty = true; return t;
}
function effRange(t) {
  const s = t.s, ty = t.def.type; let r = s.range || 0;
  if (ty === 'orbit') r = s.ring2 ? s.orbitR * 1.65 : s.orbitR;
  else if (ty === 'aura') r = s.aR;
  return r + (t.bf ? t.bf.rg : 0);
}
function canPlace(x, y, ignore) {
  if (x < 22 || x > W - 22 || y < 22 || y > H - 22) return false;
  if (gridBlocked(built, x, y)) return false;
  for (const o of built.obs) if (Math.hypot(o.x - x, o.y - y) < o.r + 14) return false;
  for (const t of G.tw) { if (t === ignore) continue; if (Math.hypot(t.x - x, t.y - y) < 34) return false; }
  return true;
}

/* ---------- Efectos visuales ---------- */
function fxRing(x, y, r0, r1, T, col, w) { G.fx.push({ k: 'ring', x, y, r0, r1, t: 0, T, col, w: w || 3 }); }
function fxText(x, y, s, col) { G.fx.push({ k: 'txt', x, y, s, t: 0, T: 1.1, col }); }
function fxPart(x, y, col, n, sp) {
  if (G.fx.length > 650) return;
  for (let i = 0; i < n; i++) { const a = rnd(TAU), v = rnd(.3, 1) * (sp || 70); G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, T: rnd(.3, .6), col, s: rnd(1.5, 3.5) }); }
}
function fxBolt(pts, col, T) { G.fx.push({ k: 'bolt', pts, t: 0, T: T || .18, col }); }
function fxLine(x1, y1, x2, y2, col, T, w) { G.fx.push({ k: 'line', x1, y1, x2, y2, t: 0, T: T || .12, col, w: w || 3 }); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

/* ---------- Enemigos ---------- */
function mkEnemy(t, pi, d, o) {
  const ed = E[t], fort = !!o.fort;
  const hp = ed.hp * (fort ? 2 : 1) * (ed.boss ? hpMul(G.round) : 1);
  return { id: ++EID, t, pi, d, camo: !!o.camo, regrow: !!o.regrow, fort, hp, mhp: hp, top: o.top || t, sf: 1, sft: 0, st: 0, fz: 0, bn: 0, bd: 0, wk: 0, wv: 0, as: 1, x: 0, y: 0, ang: 0, v: 0, r: ed.r, obT: {}, ph: Math.random() * 6, rg: 0, dead: false };
}
function setPos(e) { const q = posOn(G.paths[e.pi], e.d); e.x = q[0]; e.y = q[1]; e.ang = q[2]; }
function immuneTo(e, kind) { const im = E[e.t].imm; return !!kind && im.indexOf(kind) >= 0; }
function hurt(e, dmg, kind, tw, fx) {
  if (e.dead) return false;
  const ed = E[e.t];
  if (immuneTo(e, kind)) { if (G.fx.length < 600) fxPart(e.x, e.y, '#fff', 2, 40); return false; }
  let d = dmg; fx = fx || null;
  if (fx && fx.bonus) { let m = 1; for (const tg of ed.tags) { const b = fx.bonus[tg]; if (b && b > m) m = b; } d *= m; }
  if (fx && fx.crit && Math.random() < fx.crit) { d *= 3; fxText(e.x, e.y - e.r, '¡Crítico!', '#ffeb3b'); }
  if (e.wk > 0) d *= 1 + e.wv;
  if (d > 0) damageRaw(e, d, tw);
  if (!e.dead && fx) applyFx(e, fx);
  return true;
}
function applyFx(e, s) {
  const big = !!E[e.t].boss;
  if (s.slowF && s.slowF < 1) { const f = big ? 1 - (1 - s.slowF) * .6 : s.slowF; e.sf = e.sft > 0 ? Math.min(e.sf, f) : f; e.sft = Math.max(e.sft, s.slowT || 1); }
  if (s.freezeT) e.fz = Math.max(e.fz, s.freezeT * (big ? .3 : 1));
  if (s.stunT) e.st = Math.max(e.st, s.stunT * (big ? .3 : 1));
  if (s.knock) e.d = Math.max(0, e.d - s.knock * (big ? .15 : 1));
  if (s.weak) { e.wk = Math.max(e.wk, s.weakT || 2); e.wv = Math.max(e.wv, s.weak); }
  if (s.burn) { e.bn = Math.max(e.bn, s.burnT || 2); e.bd = Math.max(e.bd, s.burn); }
}
function damageRaw(e, d, tw) {
  if (e.dead || d <= 0) return;
  e.hp -= d;
  if (e.hp <= 0) kill(e, tw, -e.hp);
}
function kill(e, tw, over) {
  if (e.dead) return;
  e.dead = true;
  const ed = E[e.t];
  G.money += ed.rew * G.rewMul; G.pops++;
  if (tw && tw.s && tw.s.cashPop) G.money += tw.s.cashPop * G.rewMul;
  const col = ECOL[e.t] || '#fff';
  if (ed.boss) { fxPart(e.x, e.y, col, 26, 150); fxRing(e.x, e.y, 10, 90, .5, col, 5); fxText(e.x, e.y - 20, '+$' + Math.round(ed.rew * G.rewMul), '#ffd54a'); sfx('boom'); }
  else { fxPart(e.x, e.y, col, 4, 70); sfx('pop'); }
  const kids = ed.kids;
  for (let i = 0; i < kids.length; i++) {
    const kt = kids[i];
    const k = mkEnemy(kt, e.pi, Math.max(0, e.d - i * 7 - rnd(0, 5)), { camo: e.camo, regrow: e.regrow, fort: e.fort, top: (CHAIN.indexOf(kt) >= 0 && CHAIN.indexOf(e.top) >= 0) ? e.top : kt });
    k.sf = e.sf; k.sft = e.sft; k.wk = e.wk; k.wv = e.wv; k.fz = e.fz * .5; k.st = e.st;
    setPos(k); G.en.push(k);
    if (over > 0 && !ed.noOver) damageRaw(k, over, tw);
  }
}
function enemyLoss(e) { const l = Math.max(1, Math.round(E[e.t].rbe * (e.fort ? 2 : 1))); return E[e.t].boss ? Math.min(l, Math.max(10, Math.round(G.diff.lives * .4))) : l; }
function rbeOf(e) { return E[e.t].rbe * (e.fort ? 2 : 1) + e.hp * .01; }

function updEnemies(dt) {
  for (const e of G.en) {
    if (e.dead) continue;
    const ed = E[e.t];
    if (e.st > 0) e.st -= dt;
    if (e.fz > 0) e.fz -= dt;
    if (e.sft > 0) { e.sft -= dt; if (e.sft <= 0) e.sf = 1; }
    if (e.wk > 0) { e.wk -= dt; if (e.wk <= 0) e.wv = 0; }
    if (e.bn > 0) { e.bn -= dt; damageRaw(e, e.bd * dt, null); if (e.dead) continue; if (e.bn <= 0) e.bd = 0; }
    if (e.regrow && e.t !== e.top && UP[e.t]) { e.rg += dt; if (e.rg > 2.4) { e.rg = 0; e.t = UP[e.t]; e.r = E[e.t].r; e.hp = E[e.t].hp * (e.fort ? 2 : 1); e.mhp = e.hp; } }
    let sp = BASE * ed.spd;
    if (e.st > 0 || e.fz > 0) sp = 0; else sp *= e.sf * e.as;
    e.as = 1; e.v = sp;
    e.d += sp * dt;
    const path = G.paths[e.pi];
    if (e.d >= path.total) {
      e.dead = true; const loss = enemyLoss(e); G.leaked += loss;
      if (G.mode.id !== 'sand') G.lives -= loss;
      G.flash = .35; sfx('leak'); fxText(Math.min(W - 40, e.x), Math.min(H - 40, Math.max(40, e.y)), '-' + loss + '❤', '#ff5252');
      continue;
    }
    setPos(e);
  }
  let j = 0; const a = G.en;
  for (let i = 0; i < a.length; i++) if (!a[i].dead) a[j++] = a[i];
  a.length = j;
}

/* ---------- Torres ---------- */
function target(t, range) {
  const rg = range === undefined ? t.e.range : range, mode = t.mode; let best = null, bv = 0;
  for (const e of G.en) {
    if (e.dead) continue;
    if (e.camo && !t.e.det) continue;
    const dx = e.x - t.x, dy = e.y - t.y, d2 = dx * dx + dy * dy, rr = rg + e.r * .5;
    if (d2 > rr * rr) continue;
    let v;
    if (mode === 'first') v = e.d; else if (mode === 'last') v = -e.d; else if (mode === 'close') v = -d2; else v = rbeOf(e);
    if (best === null || v > bv) { best = e; bv = v; }
  }
  return best;
}
function leadPoint(t, e, sp) {
  const p = G.paths[e.pi], d0 = Math.hypot(e.x - t.x, e.y - t.y), tm = d0 / sp;
  const q = posOn(p, Math.min(p.total, e.d + e.v * tm));
  return [q[0], q[1]];
}
function mkProj(t, a, o) {
  const s = t.s, sp = (o && o.sp) || s.pspeed || 500;
  const p = { x: t.x + Math.cos(a) * 14, y: t.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, dmg: t.e.dmg, pierce: s.pierce || 1, hit: [], life: (t.e.range + 60) / sp,
    kind: s.kind || 'normal', fx: t.fx, tw: t, vis: s.vis, home: s.homing || 0, det: t.e.det, r: 7, type: 'shot', splR: s.splashR || 0, xd: s.splashD || 0,
    ph: Math.random() * 6, age: 0, bn: 0, cl: s.cluster || 0, tg: null };
  if (o) Object.assign(p, o);
  G.pr.push(p); return p;
}
function explode(x, y, R, dmg, kind, tw, fx, skip) {
  fxRing(x, y, R * .2, R, .3, '#ffb74d', 4); fxPart(x, y, '#ff9800', 8, 90); sfx('boom');
  const arr = G.en, n = arr.length;
  for (let i = 0; i < n; i++) {
    const e = arr[i];
    if (e.dead || e.id === skip) continue;
    if (Math.hypot(e.x - x, e.y - y) <= R + e.r * .6) hurt(e, dmg, kind, tw, fx);
  }
}
function cluster(x, y, n, R, dmg, tw, kind, fx) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), d = rnd(40, 95), tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d;
    G.pr.push({ x, y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, sp: 260, dmg, xd: 0, type: 'bomb', vis: 'minibomb', tx, ty, life: d / 260 + .1, pierce: 1, hit: [], kind, fx, tw, det: true, r: 4, splR: R * .6, ph: 0, age: 0, home: 0, cl: 0 });
  }
}
const FIRE = {
  shot(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, sp = s.pspeed || 500, lp = leadPoint(t, tg, sp), a0 = Math.atan2(lp[1] - t.y, lp[0] - t.x);
    t.ang = a0; t.fire = .12;
    const n = s.shots || 1, dirs = [];
    for (let i = 0; i < n; i++) dirs.push(s.ring ? a0 + i / n * TAU : a0 + (n > 1 ? (i / (n - 1) - .5) * (s.fan || 0) : 0));
    const all = s.sym ? dirs.concat(dirs.map((a) => a + Math.PI)) : dirs;
    for (const a of all) mkProj(t, a, {});
    sfx('shoot'); return true;
  },
  boom(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, sp = s.pspeed || 340, a0 = Math.atan2(tg.y - t.y, tg.x - t.x), n = s.shots || 1;
    t.ang = a0; t.fire = .12;
    const out = clamp(Math.hypot(tg.x - t.x, tg.y - t.y) + 35, 70, t.e.range + 30);
    for (let i = 0; i < n; i++) mkProj(t, a0 + (n > 1 ? (i / (n - 1) - .5) * (s.fan || .3) : 0), { type: 'boom', out, trav: 0, st: 0, life: 99 });
    sfx('shoot'); return true;
  },
  bomb(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, sp = s.pspeed || 300, lp = leadPoint(t, tg, sp), a = Math.atan2(lp[1] - t.y, lp[0] - t.x);
    t.ang = a; t.fire = .15;
    const dd = Math.hypot(lp[0] - t.x, lp[1] - t.y);
    mkProj(t, a, { type: 'bomb', tx: lp[0], ty: lp[1], life: dd / sp + .3, pierce: 1, xd: t.e.dmg + (s.splashD || 0), r: 3 });
    sfx('shoot'); return true;
  },
  bounce(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, sp = s.pspeed || 480, lp = leadPoint(t, tg, sp), a0 = Math.atan2(lp[1] - t.y, lp[0] - t.x), n = s.shots || 1;
    t.ang = a0; t.fire = .12;
    for (let i = 0; i < n; i++) mkProj(t, a0 + (n > 1 ? (i / (n - 1) - .5) * (s.fan || .3) : 0), { type: 'bounce', bn: s.bounces || 0, life: 4 });
    sfx('shoot'); return true;
  },
  sniper(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, a = Math.atan2(tg.y - t.y, tg.x - t.x);
    t.ang = a; t.fire = .15;
    const tx = tg.x, ty = tg.y;
    hurt(tg, t.e.dmg, s.kind, t, t.fx);
    if ((s.pierce || 1) > 1) {
      let left = s.pierce - 1;
      for (const e of G.en) {
        if (left <= 0) break; if (e.dead || e === tg) continue; if (e.camo && !t.e.det) continue;
        const dx = e.x - t.x, dy = e.y - t.y, proj = dx * Math.cos(a) + dy * Math.sin(a);
        if (proj < 0) continue;
        const dist = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        if (dist < e.r + 10) { hurt(e, t.e.dmg, s.kind, t, t.fx); left--; }
      }
    }
    fxLine(t.x, t.y, tx, ty, '#fff59d', .14, 3.5); fxRing(tx, ty, 4, 22, .25, '#fff176'); sfx('snipe'); return true;
  },
  chain(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, hit = [tg.id], pts = [[t.x, t.y], [tg.x, tg.y]], targets = [tg];
    t.ang = Math.atan2(tg.y - t.y, tg.x - t.x); t.fire = .15;
    let cur = tg;
    for (let j = 0; j < (s.chain || 0); j++) {
      let nx = null, bd = 1e9;
      for (const e of G.en) {
        if (e.dead || hit.indexOf(e.id) >= 0) continue; if (e.camo && !t.e.det) continue;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < 115 && d < bd) { nx = e; bd = d; }
      }
      if (!nx) break; hit.push(nx.id); pts.push([nx.x, nx.y]); targets.push(nx); cur = nx;
    }
    for (const e of targets) hurt(e, t.e.dmg, s.kind, t, t.fx);
    fxBolt(pts, t.def.col === '#fbc02d' ? '#fff59d' : '#ffe082'); sfx('shoot'); return true;
  },
  pulse(t) {
    const r = t.e.range, list = [];
    for (const e of G.en) {
      if (e.dead) continue; if (e.camo && !t.e.det) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) <= r + e.r * .5) list.push(e);
    }
    if (!list.length) return false;
    for (const e of list) hurt(e, t.e.dmg, t.s.kind, t, t.fx);
    fxRing(t.x, t.y, 12, r, .38, t.s.kind === 'cold' ? '#b3e5fc' : '#ffcc80', 5); fxPart(t.x, t.y, t.s.kind === 'cold' ? '#e1f5fe' : '#ffcc80', 8, 110);
    t.fire = .2; sfx(t.s.kind === 'cold' ? 'coin' : 'boom'); return true;
  },
  spray(t) {
    const tg = target(t); if (!tg) return false;
    const s = t.s, a = Math.atan2(tg.y - t.y, tg.x - t.x), half = (s.cone || .75) / 2, r = t.e.range;
    t.ang = a; t.fire = .2;
    const arr = G.en, n = arr.length;
    for (let i = 0; i < n; i++) {
      const e = arr[i];
      if (e.dead) continue; if (e.camo && !t.e.det) continue;
      const dx = e.x - t.x, dy = e.y - t.y, d = Math.hypot(dx, dy);
      if (d > r + e.r * .5) continue;
      if (Math.abs(angDiff(Math.atan2(dy, dx), a)) <= half + Math.atan2(e.r, Math.max(d, 1))) hurt(e, t.e.dmg, s.kind, t, t.fx);
    }
    if (G.fx.length < 500) for (let i = 0; i < 3; i++) { const aa = a + rnd(-half, half), sp = rnd(r * 1.3, r * 2.2); G.fx.push({ k: 'p', x: t.x + Math.cos(aa) * 16, y: t.y + Math.sin(aa) * 16, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, t: 0, T: .42, col: i ? '#81d4fa' : '#e1f5fe', s: rnd(2, 3.6) }); }
    return true;
  },
  mine(t) {
    const s = t.s;
    if (t.mines >= (s.mines || 4)) return false;
    const rg = t.e.range; let spot = null;
    if (s.smart) {
      const tg = target(t, rg + 30);
      if (tg) { const q = posOn(G.paths[tg.pi], Math.min(G.paths[tg.pi].total, tg.d + 25)); spot = [q[0], q[1]]; }
    }
    if (!spot) {
      const cands = [];
      for (const p of G.paths) for (let i = 4; i < p.n; i += 5) { const q = p.pts[i], d = Math.hypot(q[0] - t.x, q[1] - t.y); if (d <= rg && d >= 20 && q[0] > 5 && q[0] < W - 5 && q[1] > 5 && q[1] < H - 5) cands.push(q); }
      if (!cands.length) return false;
      spot = cands[(Math.random() * cands.length) | 0];
    }
    for (const m of G.mines) if (Math.hypot(m.x - spot[0], m.y - spot[1]) < 18) return false;
    G.mines.push({ x: spot[0], y: spot[1], arm: .6, tw: t, dmg: t.e.dmg, R: s.mineR || 46, ph: Math.random() * 6 });
    t.mines++; t.ang = Math.atan2(spot[1] - t.y, spot[0] - t.x); t.fire = .15; sfx('place'); return true;
  }
};
function orbitTick(t, dt) {
  const s = t.s; t.ob = (t.ob || 0) + (s.spin || 3) * dt; t.bpos = [];
  const rings = [[s.blades || 0, s.orbitR, 1]]; if (s.ring2 && s.blades2) rings.push([s.blades2, s.orbitR * 1.65, -.8]);
  for (const [n, R, dir] of rings) for (let i = 0; i < n; i++) {
    const a = dir * t.ob + i / n * TAU, bx = t.x + Math.cos(a) * R, by = t.y + Math.sin(a) * R;
    t.bpos.push({ x: bx, y: by, a: a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2) });
    const arr = G.en, cnt = arr.length;
    for (let ei = 0; ei < cnt; ei++) {
      const e = arr[ei];
      if (e.dead) continue; if (e.camo && !t.e.det) continue;
      const dx = e.x - bx, dy = e.y - by, rr = e.r + 11;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (G.time - (e.obT[t.id] || -9) < (s.hitCd || .45)) continue;
      e.obT[t.id] = G.time; hurt(e, t.e.dmg, s.kind, t, t.fx);
    }
  }
}
function incomeTick(t, dt) {
  const s = t.s; t.cashT += dt; const ci = s.cashInt || 8;
  if (t.cashT >= ci) { t.cashT -= ci; const v = Math.round(s.cash * G.rewMul); G.money += v; fxText(t.x, t.y - 26, '+$' + v, '#ffd54a'); sfx('coin'); }
}
function updTowers(dt) {
  for (const t of G.tw) { t.bf.r = 1; t.bf.rg = 0; t.bf.d = 0; t.bf.det = false; }
  G.discount = 0;
  for (const a of G.tw) {
    const s = a.s;
    if (s.discount) G.discount = Math.max(G.discount, Math.min(.25, s.discount));
    const R = s.aR;
    if (R > 0) {
      for (const t of G.tw) {
        if (t === a) continue;
        if (Math.hypot(t.x - a.x, t.y - a.y) <= R) { const b = t.bf; if (s.aRate && s.aRate < b.r) b.r = s.aRate; if (s.aRng > b.rg) b.rg = s.aRng; if (s.aDmg > b.d) b.d = s.aDmg; if (s.aDet) b.det = true; }
      }
      if (s.aWeak || s.aSlow) for (const e of G.en) {
        if (e.dead) continue;
        if (Math.hypot(e.x - a.x, e.y - a.y) <= R) { if (s.aWeak) { e.wk = Math.max(e.wk, .3); e.wv = Math.max(e.wv, s.aWeak); } if (s.aSlow) e.as = Math.min(e.as, s.aSlow); }
      }
    }
  }
  if (G.boost.t > 0) G.boost.t -= dt;
  const gm = G.boost.t > 0 ? G.boost.m : 1;
  for (const t of G.tw) {
    const s = t.s, b = t.bf, ty = t.def.type;
    t.e = { range: effRange(t), rate: Math.max(.05, (s.rate || 1) * b.r * gm), dmg: (s.dmg || 0) + b.d, det: !!(s.detect || b.det) };
    if (t.fire > 0) t.fire -= dt;
    if (ty === 'income') incomeTick(t, dt);
    else if (ty === 'orbit') orbitTick(t, dt);
    else if (ty === 'aura') { /* pasiva */ }
    else {
      t.cd -= dt;
      if (t.cd <= 0) { if (FIRE[ty](t)) t.cd = t.e.rate; else t.cd = 0; }
    }
  }
}
function updMines(dt) {
  for (const m of G.mines) {
    if (m.dead) continue;
    if (m.arm > 0) { m.arm -= dt; continue; }
    for (const e of G.en) {
      if (e.dead) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) < e.r + 12) {
        m.dead = true; m.tw.mines = Math.max(0, m.tw.mines - 1);
        const s = m.tw.s; explode(m.x, m.y, m.R, m.dmg, 'explosive', m.tw, m.tw.fx);
        if (s.cluster) cluster(m.x, m.y, s.cluster, m.R, m.dmg * .6, m.tw, 'explosive', m.tw.fx);
        break;
      }
    }
  }
  G.mines = G.mines.filter((m) => !m.dead);
}
function nearestEnemy(x, y, rg, det, hit) {
  let best = null, bd = rg * rg;
  for (const e of G.en) {
    if (e.dead || (e.camo && !det) || hit.indexOf(e.id) >= 0) continue;
    const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function updProjs(dt) {
  for (const p of G.pr) {
    if (p.dead) continue;
    p.age += dt; p.life -= dt;
    if (p.type === 'bomb') {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.hypot(p.tx - p.x, p.ty - p.y) < p.sp * dt * 1.2 || p.life <= 0) {
        p.dead = true; const R = p.splR || 50;
        explode(p.tx, p.ty, R, p.xd + (p.xd === 0 ? p.dmg : 0), p.kind, p.tw, p.fx);
        if (p.cl) cluster(p.tx, p.ty, p.cl, R, (p.xd || p.dmg) * .6, p.tw, p.kind, p.fx);
      }
      continue;
    }
    if (p.type === 'boom') {
      const tw = p.tw;
      if (p.st === 0) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.trav += p.sp * dt;
        if (p.trav >= p.out) { p.st = 1; p.hit = []; }
      } else {
        const dx = tw.x - p.x, dy = tw.y - p.y, d = Math.hypot(dx, dy) || 1, sp = p.sp * 1.15;
        p.vx = dx / d * sp; p.vy = dy / d * sp; p.x += p.vx * dt; p.y += p.vy * dt;
        if (d < 14 || p.age > 7) { p.dead = true; continue; }
      }
    } else {
      if (p.life <= 0) { p.dead = true; continue; }
      if (p.home) {
        let tg = p.tg;
        if (!tg || tg.dead || p.hit.indexOf(tg.id) >= 0) tg = p.tg = nearestEnemy(p.x, p.y, 280, p.det, p.hit);
        if (tg) {
          const want = Math.atan2(tg.y - p.y, tg.x - p.x); let cur = Math.atan2(p.vy, p.vx);
          const mx = p.home * dt * 2.2; cur += clamp(angDiff(want, cur), -mx, mx);
          p.vx = Math.cos(cur) * p.sp; p.vy = Math.sin(cur) * p.sp;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { p.dead = true; continue; }
    }
    const arr = G.en, n = arr.length;
    for (let ei = 0; ei < n; ei++) {
      const e = arr[ei];
      if (e.dead) continue;
      if (e.camo && !p.det) continue;
      const dx = e.x - p.x, dy = e.y - p.y, rr = e.r + p.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (p.hit.indexOf(e.id) >= 0) continue;
      p.hit.push(e.id);
      hurt(e, p.dmg, p.kind, p.tw, p.fx);
      if (p.splR && p.xd > 0 && p.type !== 'bomb') explode(p.x, p.y, p.splR, p.xd, p.kind, p.tw, p.fx, e.id);
      if (p.type === 'bounce' && p.bn > 0) {
        const nx = nearestEnemy(p.x, p.y, 170, p.det, p.hit);
        if (nx) { const a = Math.atan2(nx.y - p.y, nx.x - p.x); p.vx = Math.cos(a) * p.sp; p.vy = Math.sin(a) * p.sp; p.bn--; p.life = 3; p.pierce = Math.max(p.pierce, 1); continue; }
      }
      p.pierce--;
      if (p.pierce <= 0) { p.dead = true; break; }
    }
  }
  let j = 0; const a = G.pr;
  for (let i = 0; i < a.length; i++) if (!a[i].dead) a[j++] = a[i];
  a.length = j;
}
function updFx(dt) {
  for (const f of G.fx) {
    f.t += dt;
    if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .93; f.vy *= .93; }
    else if (f.k === 'txt') f.y -= 22 * dt;
  }
  let j = 0; const a = G.fx;
  for (let i = 0; i < a.length; i++) if (a[i].t < a[i].T) a[j++] = a[i];
  a.length = j;
}

/* ---------- Rondas ---------- */
function announce(a, b, T) { G.banner = { a, b, t: 0, T: T || 2.4 }; }
function startRound() {
  if (!G || G.waveOn || G.over) return;
  G.round++;
  const groups = genRound(G.round), ev = []; let boss = null, newT = null, camoNew = false;
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) ev.push({ t: g.start + i * g.gap, type: g.type, camo: g.camo, regrow: g.regrow, fort: g.fort });
    if (E[g.type].boss && !boss) boss = g.type;
    if (!G.seen[g.type]) { G.seen[g.type] = 1; if (!newT) newT = g.type; }
    if (g.camo && !G.seenCamo) { G.seenCamo = true; camoNew = true; }
  }
  ev.sort((a, b) => a.t - b.t); G.q = ev; G.qt = 0; G.waveOn = true;
  if (boss) { announce('¡Ronda ' + G.round + '!', '⚠ ' + E[boss].n, 3); sfx('boss'); }
  else if (camoNew) announce('Ronda ' + G.round, '👁 ¡Camuflados! Mejora torres para detectarlos', 3.4);
  else if (newT) { const im = E[newT].imm.map((i) => ({ explosive: 'explosiones', cold: 'frío', sharp: 'punzantes' }[i])); announce('Ronda ' + G.round, 'Nuevo: ' + E[newT].n + (im.length ? ' (inmune a ' + im.join(', ') + ')' : ''), 3); }
  else announce('Ronda ' + G.round, '', 1.4);
  sfx('place');
}
function updSpawns(dt) {
  if (!G.waveOn) { if (G.auto && G.autoT > 0) { G.autoT -= dt; if (G.autoT <= 0) startRound(); } return; }
  G.qt += dt;
  while (G.q.length && G.q[0].t <= G.qt) {
    const ev = G.q.shift(), pi = G.spawnN++ % G.paths.length;
    const e = mkEnemy(ev.type, pi, 0, ev); setPos(e); G.en.push(e);
  }
  if (!G.q.length && !G.en.length) endRound();
}
function heroLevel(round) { let l = 1; for (let i = 1; i < HERO_LV_ROUNDS.length; i++) if (round >= HERO_LV_ROUNDS[i]) l = i + 1; return l; }
function endRound() {
  G.waveOn = false;
  const bonus = Math.round((120 + G.round * 2) * G.rewMul); G.money += bonus;
  for (const t of G.tw) {
    const s = t.s;
    if (s.life) { G.lives += s.life; fxText(t.x, t.y - 26, '+' + s.life + '❤', '#ff8a80'); }
    if (s.rcash) { const v = Math.round(s.rcash * G.rewMul); G.money += v; fxText(t.x, t.y - 38, '+$' + v, '#ffd54a'); }
    if (s.interest) { const g = Math.min(Math.floor(G.money * s.interest), s.icap || 0); if (g > 0) { G.money += g; fxText(t.x, t.y - 50, '+$' + g, '#a5d6a7'); } }
  }
  if (G.hero) {
    const nl = heroLevel(G.round - G.heroStart + 1 + G.heroStartLv);
    if (nl > G.hero.lvl) { G.hero.lvl = Math.min(10, nl); recalc(G.hero); G.abDirty = true; fxText(G.hero.x, G.hero.y - 30, '¡Nivel ' + G.hero.lvl + '!', '#ffee58'); fxRing(G.hero.x, G.hero.y, 8, 50, .6, '#ffee58', 4); renderPanel(); }
  }
  if (G.round >= G.maxRound && !G.free) { endGame(true); return; }
  announce('Ronda ' + G.round + ' superada', '+$' + bonus, 1.8);
  if (G.auto) G.autoT = 1.2;
  G.uiDirty = true;
}
function endGame(win) {
  G.over = true;
  const di = S.diff, mult = 1 + di * .5 * (G.mode.id === 'sand' ? 0 : 1);
  let xp = G.mode.id === 'sand' ? 0 : Math.floor(G.round * mult * (win ? 1.6 : 1) * (G.mode.id === 'std' ? 1 : .8));
  PROF.xp += xp;
  if (win && G.mode.id !== 'sand') { PROF.medals[G.def.id + ':' + DIFFS[di].id + ':' + G.mode.id] = 1; }
  saveProf(); sfx(win ? 'win' : 'leak');
  showOv(win ? 'victory' : 'defeat', xp);
}

/* ---------- Habilidades y poderes ---------- */
function castAbility(t, a) {
  if (!G || G.over) return;
  if (G.time < (t.abT[a.id] || 0)) return;
  t.abT[a.id] = G.time + a.cd; sfx('ab');
  const boss = (e) => !!E[e.t].boss;
  fxRing(t.x, t.y, 10, 120, .6, t.def.col, 6);
  switch (a.a) {
    case 'nuke': G.flash = .25; for (const e of G.en.slice()) hurt(e, a.v, 'normal', t, null); break;
    case 'freezeAll': for (const e of G.en) e.fz = Math.max(e.fz, a.v * (boss(e) ? .3 : 1)); break;
    case 'stunAll': for (const e of G.en) e.st = Math.max(e.st, a.v * (boss(e) ? .3 : 1)); break;
    case 'cash': G.money += a.v; fxText(t.x, t.y - 30, '+$' + a.v, '#ffd54a'); break;
    case 'heal': G.lives += a.v; fxText(t.x, t.y - 30, '+' + a.v + '❤', '#ff8a80'); break;
    case 'boost': G.boost = { t: a.t || 8, m: a.v }; break;
    case 'push': for (const e of G.en) e.d = Math.max(0, e.d - a.v * (boss(e) ? .2 : 1)); break;
    case 'weakAll': for (const e of G.en) { e.wk = Math.max(e.wk, a.t || 8); e.wv = Math.max(e.wv, a.v); } break;
    case 'clear': for (const e of G.en.slice()) { if (e.dead || boss(e)) continue; if (E[e.t].tags.indexOf(a.v) >= 0) kill(e, t, 99999); } break;
  }
  G.abDirty = true;
}
function usePower(id) {
  if (!G || G.over || !G.powers[id]) return;
  G.powers[id]--; sfx('ab');
  const dummy = { s: {}, def: { col: '#fff' }, x: W / 2, y: H / 2 };
  if (id === 'cash') { G.money += 1500; fxText(W / 2, H / 2, '+$1500', '#ffd54a'); }
  else if (id === 'freeze') for (const e of G.en) e.fz = Math.max(e.fz, 4 * (E[e.t].boss ? .3 : 1));
  else if (id === 'clean') { G.flash = .3; for (const e of G.en.slice()) hurt(e, 40, 'normal', null, null); }
  else if (id === 'life') { G.lives += 40; fxText(W / 2, H / 2, '+40❤', '#ff8a80'); }
  renderPowers();
}

/* ---------- Bucle ---------- */
function update(dt) {
  G.time += dt;
  if (G.mode.id === 'sand') { G.money = 99999; G.lives = Math.max(G.lives, 999); }
  updSpawns(dt); updTowers(dt); updMines(dt); updEnemies(dt); updProjs(dt); updFx(dt);
  updAmbient(G.amb, dt, G.time);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.T) G.banner = null; }
  if (G.flash > 0) G.flash -= dt;
  if (!G.over && G.lives <= 0) endGame(false);
}

/* ---------- Dibujo ---------- */
function drawGame() {
  const c = ctx, t = G.time;
  c.drawImage(bgCan, 0, 0);
  drawAmbient(c, G.amb, t);
  // entradas y meta
  for (const s of G.starts) { c.save(); c.translate(clamp(s[0], 24, W - 24), clamp(s[1], 24, H - 24)); c.rotate(s[2]); c.fillStyle = 'rgba(255,60,60,.85)'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-6 + i * 10, -10); c.lineTo(4 + i * 10, 0); c.lineTo(-6 + i * 10, 10); c.lineTo(-2 + i * 10, 0); c.closePath(); c.fill(); c.stroke(); } c.restore(); }
  for (const g of G.goals) { c.save(); c.translate(g[0], g[1]); const pu = 1 + Math.sin(t * 3) * .05; c.scale(pu, pu); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.fill(); c.strokeStyle = '#43a047'; c.lineWidth = 3; c.stroke();
    c.font = '30px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText('🌍', 0, 2); c.restore(); }
  // minas
  for (const m of G.mines) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(m.x + 1, m.y + 3, 8, 4, 0, 0, TAU); c.fill(); c.fillStyle = '#455a64'; c.beginPath(); c.arc(m.x, m.y, 7, 0, TAU); c.fill(); c.strokeStyle = '#263238'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = m.arm > 0 ? '#ffd54a' : (Math.sin(t * 8 + m.ph) > 0 ? '#ff1744' : '#7f0000'); c.beginPath(); c.arc(m.x, m.y, 2.6, 0, TAU); c.fill(); }
  // torres
  const tws = G.tw.slice().sort((a, b) => a.y - b.y);
  for (const tw of tws) {
    const sp = towerSprite(tw.def), ty = tw.def.type;
    if (ty === 'aura' || tw.s.aR > 0 && ty === 'aura') { c.strokeStyle = tw.def.col; c.globalAlpha = .12 + .08 * Math.sin(t * 3); c.lineWidth = 3; c.beginPath(); c.arc(tw.x, tw.y, tw.s.aR, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    if (ty === 'spray' && tw.fire > 0) { const half = (tw.s.cone || .75) / 2, r = tw.e ? tw.e.range : 100; c.fillStyle = 'rgba(129,212,250,.16)'; c.beginPath(); c.moveTo(tw.x, tw.y); c.arc(tw.x, tw.y, r, tw.ang - half, tw.ang + half); c.closePath(); c.fill(); }
    const rec = tw.fire > 0 ? 1.5 : 0;
    if (AIMED.has(ty)) { c.save(); c.translate(tw.x, tw.y); c.rotate(tw.ang); c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(25 - rec, 0); c.lineTo(17 - rec, -6); c.lineTo(17 - rec, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    c.drawImage(sp, tw.x - 32, tw.y - 32);
    if (tw.hero) { c.strokeStyle = '#ffd54a'; c.lineWidth = 2.5; c.beginPath(); c.arc(tw.x, tw.y, 24, 0, TAU); c.stroke(); c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(tw.x + 15, tw.y - 15, 8, 0, TAU); c.fill(); c.fillStyle = '#4e342e'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tw.lvl, tw.x + 15, tw.y - 14.5); }
    else { const tt = tw.tiers; if (tt[0] + tt[1] + tt[2] > 0) { const txt = tt.join('·'); c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const w = c.measureText(txt).width + 8; c.fillStyle = 'rgba(10,20,40,.78)'; c.fillRect(tw.x - w / 2, tw.y + 21, w, 12); c.fillStyle = '#ffe082'; c.fillText(txt, tw.x, tw.y + 27.5); } }
    if (ty === 'orbit') for (const b of tw.bpos) { c.save(); c.translate(b.x, b.y); c.rotate(b.a); c.fillStyle = '#43a047'; c.strokeStyle = '#1b5e20'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(0, -8, 9, 0); c.quadraticCurveTo(0, 8, -9, 0); c.fill(); c.stroke(); c.strokeStyle = '#a5d6a7'; c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.stroke(); c.restore(); }
  }
  // enemigos
  for (let pass = 0; pass < 2; pass++) for (const e of G.en) {
    if (e.dead || (pass === 0) === !!E[e.t].boss) continue;
    const spr = enemySprite(e.t, e.camo), by = Math.sin(t * 8 + e.ph) * 1.2;
    c.drawImage(spr, e.x - spr.width / 2, e.y - spr.height / 2 + by);
    if (e.fort) { c.strokeStyle = 'rgba(90,100,110,.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(e.x, e.y + by, e.r + 2, 0, TAU); c.stroke(); }
    if (e.fz > 0) { c.fillStyle = 'rgba(160,230,255,.55)'; c.beginPath(); c.arc(e.x, e.y, e.r + 2, 0, TAU); c.fill(); c.strokeStyle = '#e1f5fe'; c.lineWidth = 1.5; c.stroke(); }
    else if (e.sft > 0) { c.strokeStyle = 'rgba(100,200,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(e.x, e.y, e.r + 1, 0, TAU); c.stroke(); }
    if (e.st > 0) { c.fillStyle = '#ffee58'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.09; c.beginPath(); c.arc(e.x + Math.cos(a) * (e.r * .7), e.y - e.r - 3 + Math.sin(a) * 3, 2.4, 0, TAU); c.fill(); } }
    if (e.bn > 0) { c.fillStyle = 'rgba(255,120,0,.6)'; c.beginPath(); c.arc(e.x + Math.sin(t * 20 + e.ph) * 3, e.y - e.r * .6, 3, 0, TAU); c.fill(); }
    if (e.wk > 0) { c.fillStyle = 'rgba(186,104,200,.9)'; c.beginPath(); c.arc(e.x - e.r * .7, e.y - e.r * .9, 3, 0, TAU); c.fill(); }
    if (e.regrow) { c.fillStyle = '#66bb6a'; c.fillRect(e.x + e.r * .6 - 1, e.y - e.r - 5, 6, 2); c.fillRect(e.x + e.r * .6 + 1, e.y - e.r - 7, 2, 6); }
    if (E[e.t].boss) { const w = e.r * 1.8; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, e.y - e.r - 12, w, 5); c.fillStyle = '#ef5350'; c.fillRect(e.x - w / 2, e.y - e.r - 12, w * clamp(e.hp / e.mhp, 0, 1), 5); }
  }
  // proyectiles
  for (const p of G.pr) {
    if (p.vis === 'orb' || p.vis === 'bubble' || p.vis === 'dove') { c.strokeStyle = p.vis === 'orb' ? 'rgba(255,128,171,.4)' : 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .045, p.y - p.vy * .045); c.stroke(); }
    drawProj(c, p, t);
  }
  // efectos
  for (const f of G.fx) {
    const k = f.t / f.T;
    if (f.k === 'ring') { c.strokeStyle = f.col; c.globalAlpha = 1 - k; c.lineWidth = f.w * (1 - k * .5); c.beginPath(); c.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * Math.min(1, k * 1.4), 0, TAU); c.stroke(); c.globalAlpha = 1; }
    else if (f.k === 'p') { c.fillStyle = f.col; c.globalAlpha = 1 - k; c.beginPath(); c.arc(f.x, f.y, f.s * (1 - k * .5), 0, TAU); c.fill(); c.globalAlpha = 1; }
    else if (f.k === 'txt') { c.globalAlpha = 1 - k * k; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 3; c.strokeText(f.s, f.x, f.y); c.fillStyle = f.col; c.fillText(f.s, f.x, f.y); c.globalAlpha = 1; }
    else if (f.k === 'bolt') { c.globalAlpha = 1 - k; c.lineJoin = 'round';
      for (const [w, col] of [[7, f.col], [2.2, '#fff']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (let i = 0; i < f.pts.length - 1; i++) { const a = f.pts[i], b = f.pts[i + 1], n = 5; if (i === 0) c.moveTo(a[0], a[1]); for (let j = 1; j <= n; j++) { const u = j / n, jx = j < n ? Math.sin(f.t * 90 + i * 7 + j * 3) * 6 : 0, jy = j < n ? Math.cos(f.t * 80 + i * 5 + j * 4) * 6 : 0; c.lineTo(a[0] + (b[0] - a[0]) * u + jx, a[1] + (b[1] - a[1]) * u + jy); } } c.stroke(); } c.globalAlpha = 1; }
    else if (f.k === 'line') { c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.lineWidth = f.w; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); c.globalAlpha = 1; }
  }
  // selección / colocación
  const rangeCircle = (x, y, r, ok) => { if (r > 1500) return; c.fillStyle = ok ? 'rgba(255,255,255,.12)' : 'rgba(255,60,60,.16)'; c.strokeStyle = ok ? 'rgba(255,255,255,.7)' : 'rgba(255,80,80,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); };
  if (G.sel && G.tw.indexOf(G.sel) >= 0) { const s = G.sel; rangeCircle(s.x, s.y, s.e ? s.e.range : effRange(s), true); c.strokeStyle = '#ffd54a'; c.lineWidth = 2.5; c.beginPath(); c.arc(s.x, s.y, 25, 0, TAU); c.stroke(); }
  if (G.placing && G.mouse.in) {
    const d = G.placing.def, ok = canPlace(G.mouse.x, G.mouse.y, G.placing.moving), r = (d.type === 'orbit') ? d.base.orbitR : d.type === 'aura' ? d.base.aR : d.base.range;
    if (r) rangeCircle(G.mouse.x, G.mouse.y, r, ok);
    c.globalAlpha = .85; c.drawImage(towerSprite(d), G.mouse.x - 32, G.mouse.y - 32); c.globalAlpha = 1;
    if (!ok) { c.strokeStyle = '#ff5252'; c.lineWidth = 4; c.beginPath(); c.moveTo(G.mouse.x - 12, G.mouse.y - 12); c.lineTo(G.mouse.x + 12, G.mouse.y + 12); c.moveTo(G.mouse.x + 12, G.mouse.y - 12); c.lineTo(G.mouse.x - 12, G.mouse.y + 12); c.stroke(); }
  }
  if (G.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + clamp(G.flash * .8, 0, .5) + ')'; c.fillRect(0, 0, W, H); }
  if (G.boost.t > 0) { c.fillStyle = 'rgba(255,235,59,.07)'; c.fillRect(0, 0, W, H); }
  if (G.banner) {
    const b = G.banner, k = b.t / b.T, al = k < .1 ? k / .1 : k > .8 ? (1 - k) / .2 : 1;
    c.globalAlpha = clamp(al, 0, 1); c.fillStyle = 'rgba(8,20,40,.72)'; const bw = 420, bh = b.b ? 72 : 48; c.beginPath(); c.roundRect ? c.roundRect(W / 2 - bw / 2, 22, bw, bh, 14) : c.rect(W / 2 - bw / 2, 22, bw, bh); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = 'bold 26px "Fredoka",sans-serif'; c.fillText(b.a, W / 2, 22 + (b.b ? 26 : 24));
    if (b.b) { c.font = '17px "Fredoka",sans-serif'; c.fillStyle = '#ffd54a'; c.fillText(b.b, W / 2, 22 + 54); } c.globalAlpha = 1;
  }
}

let last = 0, hudT = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (!G || !cv || !$('scr-game').classList.contains('on')) return;
  if (!G.paused && !G.over) for (let i = 0; i < G.speed; i++) update(dt);
  drawGame();
  hudT += dt;
  if (hudT > .15) { hudT = 0; updHud(); }
}

/* ---------- Interfaz: utilidades ---------- */
function show(id) {
  for (const s of document.querySelectorAll('.scr')) s.classList.remove('on');
  $(id).classList.add('on');
  if (id === 'scr-game') requestAnimationFrame(fit);
}
function spriteEl(src, size) { const c = newCanvas(size, size), x = c.getContext('2d'); const k = Math.min(size / src.width, size / src.height); x.drawImage(src, (size - src.width * k) / 2, (size - src.height * k) / 2, src.width * k, src.height * k); return c; }
function playerLevel() { const l = Math.floor(Math.sqrt(PROF.xp / 50)) + 1, base = (l - 1) * (l - 1) * 50, next = l * l * 50; return { l, p: (PROF.xp - base) / (next - base), xp: PROF.xp, next }; }

function buildMenu() {
  const pl = playerLevel();
  $('prof').innerHTML = '<div class="pl">Nivel <b>' + pl.l + '</b></div><div class="bar"><i style="width:' + Math.round(pl.p * 100) + '%"></i></div><div class="px">' + pl.xp + ' / ' + pl.next + ' XP</div>';
  const w = $('wheel'); if (w && !w.dataset.done) { w.dataset.done = 1; w.innerHTML = ODSC.map((c, i) => '<i style="--a:' + (i * 360 / 17) + 'deg;background:' + c + '"><b>' + (i + 1) + '</b></i>').join(''); }
}
function medalFor(id) { let n = 0; for (const d of DIFFS) if (PROF.medals[id + ':' + d.id + ':std'] || PROF.medals[id + ':' + d.id + ':rev'] || PROF.medals[id + ':' + d.id + ':half']) n++; return n; }
function buildMaps() {
  const g = $('mapgrid'); g.innerHTML = '';
  MAPS.forEach((m, i) => {
    const el = document.createElement('div'); el.className = 'mcard';
    const cvs = document.createElement('canvas'); cvs.width = 288; cvs.height = 192;
    el.appendChild(cvs);
    const info = document.createElement('div'); info.className = 'minfo';
    const dcol = { 'Fácil': '#66bb6a', 'Medio': '#ffca28', 'Difícil': '#ff7043', 'Experto': '#ab47bc' }[m.diff];
    let meds = ''; for (const d of DIFFS) meds += '<i class="med' + ((PROF.medals[m.id + ':' + d.id + ':std'] || PROF.medals[m.id + ':' + d.id + ':rev'] || PROF.medals[m.id + ':' + d.id + ':half']) ? ' on' : '') + '" style="--c:' + d.col + '" title="' + d.n + '"></i>';
    info.innerHTML = '<div class="mt"><b>' + m.name + '</b><span class="tag" style="background:' + dcol + '">' + m.diff + '</span></div><div class="mo">' + m.ods.map((o) => '<i style="background:' + ODSC[o - 1] + '">' + o + '</i>').join('') + '<span class="meds">' + meds + '</span></div><p>' + m.desc + '</p>';
    el.appendChild(info); el.onclick = () => { S.map = i; buildSetup(); show('scr-setup'); }; g.appendChild(el);
    setTimeout(() => { try { if (!PREV[m.id]) { const b = buildMap(m, false); PREV[m.id] = renderBG(m, b); PREV[m.id + 'p'] = b; } const x = cvs.getContext('2d'); x.drawImage(PREV[m.id], 0, 0, 288, 192);
      const b = PREV[m.id + 'p']; x.fillStyle = 'rgba(255,255,255,.0)'; } catch (e) {} }, 30 + i * 40);
  });
}
function buildSetup() {
  const m = MAPS[S.map], el = $('setup');
  const pill = (arr, key, fn) => arr.map((o, i) => '<button class="pill' + (S[key] === i ? ' on' : '') + '" data-k="' + key + '" data-i="' + i + '" style="--c:' + (o.col || '#4fc3f7') + '">' + fn(o) + '</button>').join('');
  el.innerHTML =
    '<h2>' + m.name + '</h2><p class="mutt">' + m.desc + '</p>' +
    '<h3>Dificultad</h3><div class="pills">' + pill(DIFFS, 'diff', (o) => '<b>' + o.n + '</b><small>' + o.d + '</small>') + '</div>' +
    '<h3>Modo</h3><div class="pills">' + pill(MODES, 'mode', (o) => '<b>' + o.emoji + ' ' + o.n + '</b><small>' + o.d + '</small>') + '</div>' +
    '<h3>Héroe</h3><div class="pills">' + pill(HEROES, 'hero', (o) => '<b>' + o.emoji + ' ' + o.name + '</b><small>' + o.title + '. ' + o.info + '</small>') + '</div>' +
    '<button class="btn big go" id="b-start">▶ ¡A defender el planeta!</button>';
  el.onclick = (ev) => {
    const b = ev.target.closest('.pill'); if (b) { S[b.dataset.k] = +b.dataset.i; buildSetup(); return; }
    if (ev.target.closest('#b-start')) startGame();
  };
}
function buildAlmanac(tab) {
  const el = $('almlist'); el.innerHTML = '';
  $('alm-t').classList.toggle('on', tab !== 'e'); $('alm-e').classList.toggle('on', tab === 'e');
  if (tab !== 'e') {
    for (const d of TOWERS) {
      const row = document.createElement('div'); row.className = 'arow'; row.appendChild(spriteEl(towerSprite(d), 56));
      const tx = document.createElement('div'); tx.innerHTML = '<b style="color:' + d.col + '">ODS ' + d.ods + ' · ' + d.name + '</b><p>' + d.info + '</p><small>⚔ ' + d.atk + ' · Coste $' + d.cost + ' · Caminos: ' + d.paths.map((p) => p.n).join(' / ') + '</small>';
      row.appendChild(tx); el.appendChild(row);
    }
    for (const h of HEROES) { const row = document.createElement('div'); row.className = 'arow'; row.appendChild(spriteEl(towerSprite({ id: 'h_' + h.id, col: h.col, emoji: h.emoji, ods: '★' }), 56)); const tx = document.createElement('div'); tx.innerHTML = '<b style="color:' + h.col + '">Héroe · ' + h.name + '</b><p>' + h.title + '. ' + h.info + '</p>'; row.appendChild(tx); el.appendChild(row); }
  } else {
    for (const k in E) {
      const d = E[k], row = document.createElement('div'); row.className = 'arow'; row.appendChild(spriteEl(enemySprite(k, false), 56));
      const tx = document.createElement('div'); tx.innerHTML = '<b>' + d.n + '</b><p>' + d.info + '</p><small>Vida ' + d.hp + ' · Velocidad ' + d.spd + (d.imm.length ? ' · Inmune: ' + d.imm.map((i) => ({ explosive: 'explosiones', cold: 'frío', sharp: 'punzantes' }[i])).join(', ') : '') + (d.kids.length ? ' · Al caer suelta ' + d.kids.length + ' enemigos' : '') + '</small>';
      row.appendChild(tx); el.appendChild(row);
    }
  }
}

/* ---------- Interfaz de juego ---------- */
function fit() {
  if (!cv) return;
  const st = $('stage'), narrow = window.innerWidth < 860;
  if (narrow) { const h = Math.min(window.innerWidth * H / W, window.innerHeight * .5); st.style.height = h + 'px'; st.style.flex = 'none'; } else { st.style.height = ''; st.style.flex = '1'; }
  const r = st.getBoundingClientRect(), k = Math.min(r.width / W, r.height / H);
  cv.style.width = Math.floor(W * k) + 'px'; cv.style.height = Math.floor(H * k) + 'px';
}
function startGame() {
  newGame();
  G.hero = null; G.heroStart = 0;
  buildShop(); show('scr-game'); setInfo(null); selectTower(null); renderPowers(); renderAbil(); updHud(); closeOv();
  announce(G.def.name, 'Pulsa ▶ para empezar la ronda 1', 3.2);
}
function setInfo(def, extra) {
  const el = $('info');
  if (!def) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  const cost = def.id && def.type && !def.paths ? def.cost : costOf(def.cost);
  el.innerHTML = '<div class="ih"><span class="chip" style="background:' + def.col + '">' + def.emoji + '</span><div><b>' + (def.name) + '</b><small>' + (def.ods ? 'ODS ' + def.ods : (def.title || '')) + '</small></div><button class="x" id="i-cancel">✕</button></div><p>' + def.info + '</p><p class="atk">⚔ ' + (def.atk || 'Dispara automáticamente.') + '</p><p class="hint">' + (extra || 'Toca el mapa para colocarla ($' + cost + ').') + '</p>';
}
function buildShop() {
  const sh = $('shop'); let h = '<div class="sh">Torres ODS</div><div class="sgrid">';
  const hd = HEROES[S.hero];
  h += '<div class="si hero" data-h="1"><span class="chip" style="background:' + hd.col + '">' + hd.emoji + '</span><b>' + hd.name + '</b><em>Héroe</em><span class="c">$' + hd.cost + '</span></div>';
  TOWERS.forEach((d, i) => { h += '<div class="si" data-i="' + i + '"><span class="chip" style="background:' + d.col + '">' + d.emoji + '</span><b>' + d.short + '</b><em>ODS ' + d.ods + '</em><span class="c"></span></div>'; });
  sh.innerHTML = h + '</div>'; refreshShop();
}
function refreshShop() {
  if (!G) return;
  for (const el of $('shop').querySelectorAll('.si')) {
    let cost, d;
    if (el.dataset.h) { d = HEROES[S.hero]; cost = d.cost; if (G.hero) { el.classList.add('dis'); el.querySelector('.c').textContent = 'En juego'; continue; } }
    else { d = TOWERS[+el.dataset.i]; cost = costOf(d.cost); }
    el.querySelector('.c').textContent = '$' + cost;
    el.classList.toggle('dis', G.money < cost);
    el.classList.toggle('on', !!(G.placing && G.placing.def === d));
  }
}
function startPlacing(def, moving) {
  G.placing = { def, moving: moving || null }; selectTower(null, true); setInfo(def, moving ? 'Toca el mapa para mover al héroe (gratis).' : null); refreshShop();
}
function cancelPlacing() { if (!G) return; G.placing = null; setInfo(null); refreshShop(); }
function tryPlace(x, y) {
  const pl = G.placing; if (!pl) return;
  if (!canPlace(x, y, pl.moving)) { announce('No se puede construir aquí', '', 1); return; }
  if (pl.moving) { pl.moving.x = x; pl.moving.y = y; G.placing = null; setInfo(null); selectTower(pl.moving); sfx('place'); return; }
  const d = pl.def, isHero = !d.paths, cost = isHero ? d.cost : costOf(d.cost);
  if (G.money < cost) { announce('Dinero insuficiente', '', 1); return; }
  G.money -= cost;
  const t = addTower(d, x, y, isHero); t.spent = cost;
  if (isHero) { G.hero = t; G.heroStart = G.round; G.heroStartLv = Math.floor(G.round * .6); t.lvl = Math.min(10, heroLevel(1 + G.heroStartLv)); recalc(t); }
  fxRing(x, y, 6, 40, .4, d.col, 4); sfx('place');
  G.placing = null; setInfo(null); refreshShop(); selectTower(t);
}
function selectTower(t, quiet) {
  G.sel = t || null; renderPanel(); if (!quiet) refreshShop();
}
const MODE_LB = { first: 'Primero', last: 'Último', close: 'Cerca', strong: 'Fuerte' };
function statList(t) {
  const s = t.s, e = t.e || { range: effRange(t), rate: s.rate, dmg: s.dmg, det: s.detect }, ty = t.def.type, r = [];
  if (ty === 'income') { r.push('💰 $' + s.cash + ' cada ' + (s.cashInt || 8).toFixed(1) + 's'); if (s.interest) r.push('📈 ' + Math.round(s.interest * 100) + '% interés (máx $' + s.icap + ')'); if (s.discount) r.push('🏷 -' + Math.round(s.discount * 100) + '% costes'); }
  else if (ty === 'aura') { r.push('🎯 Radio ' + Math.round(s.aR)); if (s.aRate && s.aRate < 1) r.push('⚡ Aliadas +' + Math.round((1 / s.aRate - 1) * 100) + '% vel.'); if (s.aDmg) r.push('💥 Aliadas +' + s.aDmg + ' daño'); if (s.aRng) r.push('📏 Aliadas +' + s.aRng + ' alcance'); if (s.aWeak) r.push('☠ Enemigos +' + Math.round(s.aWeak * 100) + '% daño'); if (s.aSlow) r.push('🐌 Enemigos x' + s.aSlow.toFixed(2) + ' vel.'); }
  else {
    if (ty === 'bomb') r.push('💥 Daño ' + (e.dmg + (s.splashD || 0)) + ' en radio ' + s.splashR); else r.push('💥 Daño ' + (+(e.dmg)).toFixed(ty === 'spray' ? 2 : 0) + (ty === 'spray' ? '/tick' : ''));
    if (ty !== 'spray') r.push('⏱ ' + (1 / e.rate).toFixed(2) + ' disp/s');
    if (e.range < 1500) r.push('📏 Alcance ' + Math.round(e.range)); else r.push('📏 Todo el mapa');
    if (s.pierce > 1 && ty !== 'bomb') r.push('➡ Perfora ' + s.pierce);
    if (s.shots > 1) r.push('✴ ' + s.shots + (s.ring ? ' en círculo' : ' proyectiles'));
    if (s.chain) r.push('⚡ ' + s.chain + ' saltos');
    if (s.bounces) r.push('↩ ' + s.bounces + ' rebotes');
    if (s.blades) r.push('🍃 ' + (s.blades + (s.ring2 ? s.blades2 || 0 : 0)) + ' hojas');
    if (s.mines) r.push('💣 ' + s.mines + ' minas');
    if (s.cluster) r.push('🎆 ' + s.cluster + ' racimos');
  }
  if (e.det || s.detect) r.push('👁 Detecta camuflaje');
  if (s.freezeT) r.push('❄ Congela ' + s.freezeT + 's'); if (s.stunT) r.push('💫 Aturde ' + s.stunT + 's'); if (s.slowF && s.slowF < 1) r.push('🐌 Ralentiza');
  if (s.burn) r.push('🔥 Quema'); if (s.weak) r.push('☠ +' + Math.round(s.weak * 100) + '% daño recibido'); if (s.knock && ty !== 'spray') r.push('↩ Empuja'); if (s.crit) r.push('🎯 ' + Math.round(s.crit * 100) + '% crítico');
  if (s.cashPop) r.push('🪙 +$' + s.cashPop + '/baja'); if (s.rcash) r.push('💵 +$' + s.rcash + '/ronda'); if (s.life) r.push('❤ +' + s.life + '/ronda');
  if (s.bonus) { const tg = { plastic: 'plástico', oil: 'petróleo', smoke: 'humo', toxic: 'tóxicos', corrupt: 'corrupción', industry: 'industria', trash: 'basura', climate: 'clima' }; r.push('🎯 ' + Object.keys(s.bonus).map((k) => 'x' + s.bonus[k] + ' ' + (tg[k] || k)).join(', ')); }
  return r;
}
function canUp(t, p) {
  const n = t.tiers.slice(); if (n[p] >= 5) return false; n[p]++;
  const s = n.slice().sort((a, b) => b - a); return s[0] <= 5 && s[1] <= 2 && s[2] === 0;
}
function renderPanel() {
  const up = $('upg'), t = G && G.sel;
  if (!t) { up.style.display = 'none'; up.innerHTML = ''; $('shop').style.display = ''; return; }
  $('shop').style.display = 'none'; up.style.display = 'block';
  const d = t.def; let h = '<div class="uh"><button class="x" id="u-close">⟵ Torres</button></div>';
  h += '<div class="ih"><span class="chip big" style="background:' + d.col + '">' + d.emoji + '</span><div><b>' + d.name + '</b><small>' + (t.hero ? 'Nivel ' + t.lvl + ' / 10' : 'ODS ' + d.ods + ' · ' + t.tiers.join('-')) + '</small></div></div>';
  h += '<div class="stats">' + statList(t).map((s) => '<span>' + s + '</span>').join('') + '</div>';
  if (AIMED.has(d.type) && d.type !== 'sniper' || d.type === 'sniper') h += '<div class="tmode">' + Object.keys(MODE_LB).map((k) => '<button data-m="' + k + '" class="' + (t.mode === k ? 'on' : '') + '">' + MODE_LB[k] + '</button>').join('') + '</div>';
  if (t.hero) {
    const nxt = HERO_LV_ROUNDS[t.lvl]; h += '<p class="hint">' + (t.lvl < 10 ? 'Sube de nivel al superar la ronda ' + Math.max(G.round, nxt + G.heroStart - 1 - G.heroStartLv) + '.' : 'Nivel máximo.') + '</p>';
    h += '<div class="abl">' + t.s.abs.map((a) => '<span>✨ ' + a.n + '</span>').join('') + '</div><button class="ubtn mv" id="u-move"><span class="un">Mover héroe</span><span class="ud">Gratis</span></button>';
  } else {
    for (let p = 0; p < 3; p++) {
      const path = d.paths[p], tr = t.tiers[p], u = path.u[tr];
      let pips = ''; for (let i = 0; i < 5; i++) pips += '<i class="' + (i < tr ? 'f' : '') + '"></i>';
      h += '<div class="prow"><div class="ph"><b>' + path.n + '</b><span class="pips">' + pips + '</span></div>';
      if (!u) h += '<div class="ubtn max"><span class="un">✔ Camino completo</span><span class="ud">' + path.u[4].n + '</span></div>';
      else if (!canUp(t, p)) h += '<div class="ubtn lock"><span class="un">🔒 ' + u.n + '</span><span class="ud">Bloqueado: máx. un camino al 5 y otro al 2</span></div>';
      else h += '<button class="ubtn" data-p="' + p + '"><span class="un">' + u.n + '</span><span class="uc" data-c="' + u.c + '">$' + costOf(u.c) + '</span><span class="ud">' + u.d + '</span></button>';
      h += '</div>';
    }
  }
  h += '<button class="sell" id="u-sell">Vender · $' + Math.floor(t.spent * .7) + '</button>';
  up.innerHTML = h; refreshUpg();
}
function refreshUpg() {
  const t = G && G.sel; if (!t) return;
  for (const b of $('upg').querySelectorAll('button.ubtn[data-p]')) { const c = costOf(+b.querySelector('.uc').dataset.c); b.querySelector('.uc').textContent = '$' + c; b.classList.toggle('dis', G.money < c); }
}
function buyUp(p) {
  const t = G.sel; if (!t || t.hero || !canUp(t, p)) return;
  const u = t.def.paths[p].u[t.tiers[p]], c = costOf(u.c);
  if (G.money < c) { announce('Dinero insuficiente', '', 1); return; }
  G.money -= c; t.spent += c; t.tiers[p]++; recalc(t); G.abDirty = true;
  fxRing(t.x, t.y, 8, 46, .45, '#ffd54a', 4); fxPart(t.x, t.y, '#ffd54a', 10, 90); sfx('up');
  if (t.tiers[p] === 5) announce(u.n, '¡Mejora máxima!', 2);
  renderPanel();
}
function sellTower(t) {
  G.money += Math.floor(t.spent * .7); G.tw = G.tw.filter((x) => x !== t); t.dead = true;
  G.mines = G.mines.filter((m) => m.tw !== t); if (t.hero) G.hero = null; G.abDirty = true;
  fxRing(t.x, t.y, 6, 36, .3, '#fff', 3); selectTower(null);
}
function renderAbil() {
  const el = $('abil'); el.innerHTML = '';
  for (const t of G.tw) for (const a of t.s.abs) {
    const b = document.createElement('button'); b.className = 'ab'; b.dataset.id = t.id + '|' + a.id;
    b.innerHTML = '<span class="e" style="background:' + t.def.col + '">' + t.def.emoji + '</span><span class="n">' + a.n + '</span><span class="cdv"></span>';
    b.onclick = () => castAbility(t, a); el.appendChild(b);
  }
  G.abDirty = false;
}
function updAbil() {
  for (const b of $('abil').querySelectorAll('.ab')) {
    const [tid, aid] = b.dataset.id.split('|'), t = G.tw.find((x) => String(x.id) === tid); if (!t) continue;
    const a = t.s.abs.find((x) => x.id === aid); if (!a) continue;
    const rem = Math.max(0, (t.abT[aid] || 0) - G.time); b.classList.toggle('rdy', rem <= 0);
    b.querySelector('.cdv').style.height = (rem / a.cd * 100) + '%';
  }
}
function renderPowers() {
  const el = $('powers'); el.innerHTML = '';
  for (const p of POWERS) { const b = document.createElement('button'); b.className = 'pw' + (G.powers[p.id] ? '' : ' dis'); b.title = p.n + ': ' + p.d; b.innerHTML = p.emoji + '<i>' + G.powers[p.id] + '</i>'; b.onclick = () => usePower(p.id); el.appendChild(b); }
}
let hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updHud() {
  if (!G) return;
  setTxt('h-lives', G.mode.id === 'sand' ? '∞' : fmt(G.lives)); setTxt('h-money', G.mode.id === 'sand' ? '∞' : fmt(G.money));
  setTxt('h-round', G.round + (G.free ? '' : '/' + G.maxRound));
  setTxt('h-play', G.waveOn ? '▶▶' : '▶'); setTxt('h-ff', '⏩ x' + G.speed);
  $('h-play').classList.toggle('pulse', !G.waveOn && !G.over); $('h-auto').classList.toggle('on', G.auto); $('h-lives').parentNode.classList.toggle('warn', G.lives < G.startLivesWarn);
  refreshShop(); refreshUpg();
  if (G.abDirty) renderAbil(); updAbil();
  for (const b of $('powers').querySelectorAll('.pw')) { /* estado en renderPowers */ }
}
function showOv(kind, xp) {
  const o = $('ov'); o.classList.add('on'); let h = '';
  if (kind === 'pause') h = '<h2>Pausa</h2><button class="btn big" id="o-res">▶ Continuar</button><button class="btn" id="o-snd">' + (PROF.snd ? '🔊 Sonido: sí' : '🔇 Sonido: no') + '</button><button class="btn" id="o-rst">↻ Reiniciar</button><button class="btn" id="o-menu">⌂ Menú principal</button>';
  else if (kind === 'victory') h = '<h2>🌍 ¡Victoria!</h2><p>Has defendido el planeta superando ' + G.round + ' rondas.</p><p class="xpg">+' + xp + ' XP</p><button class="btn big" id="o-free">♾ Seguir en modo libre</button><button class="btn" id="o-rst">↻ Jugar otra vez</button><button class="btn" id="o-menu">⌂ Menú principal</button>';
  else h = '<h2>💔 Derrota</h2><p>Los problemas han llegado a la meta en la ronda ' + G.round + '.</p><p class="xpg">+' + xp + ' XP</p><button class="btn big" id="o-rst">↻ Reintentar</button><button class="btn" id="o-menu">⌂ Menú principal</button>';
  $('ovc').innerHTML = h;
}
function closeOv() { $('ov').classList.remove('on'); }
function togglePause() { if (!G || G.over) return; G.paused = !G.paused; if (G.paused) showOv('pause'); else closeOv(); }

/* ---------- Entrada ---------- */
function cpos(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; }
function bindGame() {
  cv = $('cv'); ctx = cv.getContext('2d');
  cv.addEventListener('pointermove', (ev) => { if (!G) return; const p = cpos(ev); G.mouse.x = p.x; G.mouse.y = p.y; G.mouse.in = true; });
  cv.addEventListener('pointerleave', () => { if (G) G.mouse.in = false; });
  cv.addEventListener('pointerdown', (ev) => { if (!G) return; const p = cpos(ev); G.mouse.x = p.x; G.mouse.y = p.y; G.mouse.in = true; });
  cv.addEventListener('pointerup', (ev) => {
    if (!G || G.over || G.paused) return; const p = cpos(ev); G.mouse.x = p.x; G.mouse.y = p.y;
    if (G.placing) { tryPlace(p.x, p.y); if (ev.pointerType !== 'mouse') G.mouse.in = false; return; }
    let best = null, bd = 28;
    for (const t of G.tw) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } }
    selectTower(best);
  });
  cv.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (G) { cancelPlacing(); selectTower(null); } });
  $('side').addEventListener('click', (ev) => {
    if (!G) return; const t = ev.target;
    const si = t.closest('.si');
    if (si) { if (si.dataset.h) { if (G.hero) selectTower(G.hero); else startPlacing(HEROES[S.hero]); } else startPlacing(TOWERS[+si.dataset.i]); return; }
    if (t.closest('#i-cancel')) { cancelPlacing(); return; }
    if (t.closest('#u-close')) { selectTower(null); return; }
    const ub = t.closest('button.ubtn[data-p]'); if (ub) { buyUp(+ub.dataset.p); return; }
    if (t.closest('#u-sell')) { if (G.sel) sellTower(G.sel); return; }
    if (t.closest('#u-move')) { if (G.sel) startPlacing(G.sel.def, G.sel); return; }
    const mb = t.closest('.tmode button'); if (mb && G.sel) { G.sel.mode = mb.dataset.m; renderPanel(); }
  });
  $('h-play').onclick = () => { if (!G.waveOn) startRound(); else { G.speed = G.speed >= 3 ? 1 : G.speed + 1; } };
  $('h-ff').onclick = () => { G.speed = G.speed >= 3 ? 1 : G.speed + 1; };
  $('h-auto').onclick = () => { G.auto = !G.auto; if (G.auto && !G.waveOn) startRound(); };
  $('h-pause').onclick = togglePause;
  $('ov').addEventListener('click', (ev) => {
    const id = ev.target.id;
    if (id === 'o-res') togglePause();
    else if (id === 'o-snd') { PROF.snd = !PROF.snd; saveProf(); showOv('pause'); }
    else if (id === 'o-rst') { startGame(); }
    else if (id === 'o-menu') { G.over = true; G = null; buildMenu(); show('scr-menu'); closeOv(); }
    else if (id === 'o-free') { G.free = true; G.over = false; closeOv(); announce('Modo libre', 'Sin final: ¡hasta donde llegues!', 2.4); }
  });
  window.addEventListener('keydown', (ev) => {
    if (!G || !$('scr-game').classList.contains('on')) return;
    if (ev.code === 'Space') { ev.preventDefault(); if (!G.waveOn) startRound(); else G.speed = G.speed >= 3 ? 1 : G.speed + 1; }
    else if (ev.code === 'Escape') { if (G.placing) cancelPlacing(); else if (G.sel) selectTower(null); else togglePause(); }
    else if (ev.key === 'p' || ev.key === 'P') togglePause();
    else if (/^[1-9]$/.test(ev.key)) { const btn = $('abil').querySelectorAll('.ab')[+ev.key - 1]; if (btn) btn.click(); }
  });
  window.addEventListener('resize', fit);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.over && !G.paused) togglePause(); });
}

function init() {
  buildMenu();
  $('b-play').onclick = () => { buildMaps(); show('scr-maps'); };
  $('b-alm').onclick = () => { buildAlmanac('t'); show('scr-alm'); };
  $('b-how').onclick = () => show('scr-how');
  $('alm-t').onclick = () => buildAlmanac('t'); $('alm-e').onclick = () => buildAlmanac('e');
  for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { buildMenu(); show(b.dataset.back); };
  bindGame();
  requestAnimationFrame(frame);
}
if (typeof window !== 'undefined' && !window.__NOINIT) init();
