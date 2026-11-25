'use strict';
/* =========================================================
   ODS DEFENDERS — utilidades, mapas, fondos y sprites
   ========================================================= */
const W = 960, H = 640, TAU = Math.PI * 2;
const STEP = 4, PATHW = 46;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = (a) => a[(Math.random() * a.length) | 0];
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.0', '') + 'k' : String(Math.floor(n)));
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ---------- Caminos ---------- */
function roundCorners(p, r) {
  if (!r || p.length < 3) return p.map((q) => q.slice());
  const o = [p[0].slice()];
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1];
    const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const d1 = Math.min(r, l1 / 2), d2 = Math.min(r, l2 / 2);
    const s = [b[0] + (a[0] - b[0]) / l1 * d1, b[1] + (a[1] - b[1]) / l1 * d1];
    const e = [b[0] + (c[0] - b[0]) / l2 * d2, b[1] + (c[1] - b[1]) / l2 * d2];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, u = 1 - t;
      o.push([u * u * s[0] + 2 * u * t * b[0] + t * t * e[0], u * u * s[1] + 2 * u * t * b[1] + t * t * e[1]]);
    }
  }
  o.push(p[p.length - 1].slice());
  return o;
}
function catmull(p) {
  const o = [], P = [p[0], ...p, p[p.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let k = 0; k < 20; k++) {
      const t = k / 20, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      o.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  o.push(p[p.length - 1].slice());
  return o;
}
function resample(p, step) {
  const o = [p[0].slice()];
  let acc = 0, prev = p[0];
  for (let i = 1; i < p.length; i++) {
    const cur = p[i];
    let dx = cur[0] - prev[0], dy = cur[1] - prev[1], seg = Math.hypot(dx, dy);
    while (acc + seg >= step && seg > 0) {
      const t = (step - acc) / seg;
      prev = [prev[0] + dx * t, prev[1] + dy * t];
      o.push(prev);
      dx = cur[0] - prev[0]; dy = cur[1] - prev[1]; seg = Math.hypot(dx, dy); acc = 0;
    }
    acc += seg; prev = cur;
  }
  return o;
}
function buildMap(def, rev) {
  const paths = def.paths.map((pts) => {
    let q = rev ? pts.slice().reverse() : pts;
    q = def.smooth ? catmull(q) : roundCorners(q, def.r || 0);
    const d = resample(q, STEP);
    return { pts: d, n: d.length, total: (d.length - 1) * STEP };
  });
  const gw = W / 8, gh = H / 8, grid = new Uint8Array(gw * gh), R = PATHW / 2 + 16;
  for (const p of paths) {
    for (let i = 0; i < p.n; i += 1) {
      const x = p.pts[i][0], y = p.pts[i][1];
      const x0 = Math.max(0, Math.floor((x - R) / 8)), x1 = Math.min(gw - 1, Math.ceil((x + R) / 8));
      const y0 = Math.max(0, Math.floor((y - R) / 8)), y1 = Math.min(gh - 1, Math.ceil((y + R) / 8));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const dx = cx * 8 + 4 - x, dy = cy * 8 + 4 - y;
        if (dx * dx + dy * dy <= R * R) grid[cy * gw + cx] = 1;
      }
    }
  }
  return { def, paths, grid, gw, gh, obs: [] };
}
function gridBlocked(m, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  return m.grid[((y / 8) | 0) * m.gw + ((x / 8) | 0)] === 1;
}
function posOn(path, d) {
  const i = d / STEP, i0 = clamp(Math.floor(i), 0, path.n - 2), t = clamp(i - i0, 0, 1);
  const a = path.pts[i0], b = path.pts[i0 + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

/* ---------- Temas de mapa ---------- */
const TH = {
  farm:   { g:['#a8d86e','#93c85a'], sp:['#86bb4a','#b7e07f','#9bd065'], path:['#e8cf9b','#b08a52','#d9b97c'], pd:'dirt', amb:'leaf', feat:'fields',
            props:[['tree',4],['bush',3],['rock',1],['hay',3]], n:26 },
  lake:   { g:['#38b6e8','#1c93cc'], sp:['#63ccf3','#2aa5da','#8be1fa'], path:['#c89a65','#7b5632','#b5834f'], pd:'plank', amb:'sparkle', feat:'ripples',
            props:[['lily',5],['rockw',2],['isle',2],['reed',3]], n:24 },
  city:   { g:['#b6dca1','#a3d08d'], sp:['#9ac584','#c4e6b0','#a9d494'], path:['#5d6a73','#2c353b','#74828c'], pd:'road', amb:'dust', feat:'blocks',
            props:[['building',5],['solar',4],['tree',2],['bush',2]], n:24 },
  reef:   { g:['#1798cc','#0a6a9e'], sp:['#38b4e0','#0d7db3','#5fcaf0'], path:['#f3dca2','#c9a766','#fff0c4'], pd:'sand', amb:'bubble', feat:'caustics',
            props:[['coral',5],['fan',3],['weed',3],['rockw',2]], n:28 },
  forest: { g:['#3f8f40','#2f7a33'], sp:['#2b6f2f','#4aa04a','#3a8a3d'], path:['#9b7650','#5a3f25','#8a6742'], pd:'dirt', amb:'firefly', feat:'moss',
            props:[['tree',7],['pine',5],['bush',3],['rock',2],['mush',2]], n:42 },
  arctic: { g:['#eef8fe','#d9eef9'], sp:['#ffffff','#c5e3f3','#e3f3fb'], path:['#a8bfd2','#6a86a1','#c4d6e4'], pd:'snow', amb:'snow', feat:'icepatch',
            props:[['spine',5],['iceRock',3],['igloo',1],['snowman',1]], n:24 },
  school: { g:['#ffe9c7','#f6d8a6'], sp:['#f0cd98','#fff3dc','#ecc58c'], path:['#7e57c2','#4527a0','#9d7fe0'], pd:'carpet', amb:'sparkle', feat:'tiles',
            props:[['desk',5],['books',3],['globe',2],['pencil',2]], n:22 },
  factory:{ g:['#9fabb4','#8996a0'], sp:['#7f8c96','#b4c0c8','#94a1ab'], path:['#38424b','#1b2227','#4a5661'], pd:'belt', amb:'smoke', feat:'plates',
            props:[['gear',3],['crate',4],['tank',3],['pipe',2]], n:22 },
  desert: { g:['#f7de9e','#efcf82'], sp:['#e6bd68','#fbe9b8','#e0b25c'], path:['#d8a463','#a1702f','#c88d4a'], pd:'dirt', amb:'dust', feat:'dunes',
            props:[['cactus',5],['rock',3],['palm',2],['oasis',1]], n:22 },
  peace:  { g:['#b5e4a8','#9cd68e'], sp:['#86c978','#cdf0c2','#a3dc95'], path:['#e2e8ec','#98a6b0','#f3f6f8'], pd:'stone', amb:'leaf', feat:'meadow',
            props:[['olive',5],['fountain',1],['flag',3],['bush',3],['statue',2]], n:24 },
  market: { g:['#ffdba4','#f6c785'], sp:['#eab36c','#ffe9c4','#e5a95f'], path:['#8f7064','#5b3f36','#a68a7e'], pd:'cobble', amb:'sparkle', feat:'cobbles',
            props:[['stall',5],['barrel',3],['crateF',3],['tree',1]], n:24 },
  summit: { g:['#2d3b9e','#222f88'], sp:['#3f4fc0','#1a2575','#4a5ccc'], path:['#f1f5f8','#9fadc8','#ffffff'], pd:'gold', amb:'star', feat:'rings',
            props:[['flag',6],['pillar',5]], n:22 }
};
const RAD = { tree:24, pine:22, bush:16, rock:16, hay:16, lily:16, rockw:18, isle:34, reed:14, building:34, solar:28, coral:20, fan:20, weed:14,
  mush:12, spine:20, iceRock:18, igloo:30, snowman:16, desk:26, books:18, globe:20, pencil:16, gear:26, crate:18, tank:24, pipe:18, cactus:14,
  palm:26, oasis:42, olive:22, fountain:36, flag:12, statue:18, stall:32, barrel:16, crateF:18, pillar:16 };
const ODSC = ['#E5243B','#DDA63A','#4C9F38','#C5192D','#FF3A21','#26BDE2','#FCC30B','#A21942','#FD6925','#DD1367','#FD9D24','#BF8B2E','#3F7E44','#0A97D9','#56C02B','#00689D','#19486A'];

function sh(c, x, y, rx, ry) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x + 3, y + ry * .8, rx, ry, 0, 0, TAU); c.fill(); }
function circ(c, x, y, r, f) { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
const PROP = {
  tree(c, x, y, s) { sh(c, x, y + 8 * s, 20 * s, 8 * s); c.fillStyle = '#6d4c41'; c.fillRect(x - 3 * s, y - 2 * s, 6 * s, 14 * s);
    circ(c, x - 9 * s, y - 4 * s, 12 * s, '#2e7d32'); circ(c, x + 9 * s, y - 4 * s, 12 * s, '#2e7d32'); circ(c, x, y - 12 * s, 14 * s, '#388e3c'); circ(c, x - 4 * s, y - 15 * s, 7 * s, '#66bb6a'); },
  pine(c, x, y, s) { sh(c, x, y + 10 * s, 14 * s, 6 * s); c.fillStyle = '#5d4037'; c.fillRect(x - 2 * s, y + 4 * s, 4 * s, 8 * s);
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#1b5e20', '#2e7d32', '#43a047'][i]; c.beginPath(); c.moveTo(x, y - 20 * s + i * 8 * s); c.lineTo(x - (11 + i * 3) * s, y - 4 * s + i * 8 * s); c.lineTo(x + (11 + i * 3) * s, y - 4 * s + i * 8 * s); c.fill(); } },
  spine(c, x, y, s) { PROP.pine(c, x, y, s); c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x, y - 20 * s + i * 8 * s); c.lineTo(x - (6 + i * 2) * s, y - 11 * s + i * 8 * s); c.lineTo(x + (6 + i * 2) * s, y - 11 * s + i * 8 * s); c.fill(); } },
  bush(c, x, y, s) { sh(c, x, y + 4 * s, 14 * s, 5 * s); circ(c, x - 6 * s, y, 8 * s, '#388e3c'); circ(c, x + 6 * s, y, 8 * s, '#43a047'); circ(c, x, y - 5 * s, 9 * s, '#4caf50'); circ(c, x + 3 * s, y - 7 * s, 3 * s, '#a5d6a7'); },
  rock(c, x, y, s) { sh(c, x, y + 6 * s, 14 * s, 5 * s); c.fillStyle = '#90a4ae'; c.beginPath(); c.moveTo(x - 14 * s, y + 6 * s); c.lineTo(x - 9 * s, y - 8 * s); c.lineTo(x + 4 * s, y - 11 * s); c.lineTo(x + 14 * s, y + 2 * s); c.lineTo(x + 10 * s, y + 8 * s); c.closePath(); c.fill();
    c.fillStyle = '#cfd8dc'; c.beginPath(); c.moveTo(x - 9 * s, y - 8 * s); c.lineTo(x + 4 * s, y - 11 * s); c.lineTo(x + 2 * s, y - 2 * s); c.lineTo(x - 8 * s, y); c.fill(); },
  rockw(c, x, y, s) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + 4 * s, 18 * s, 9 * s, 0, 0, TAU); c.stroke(); PROP.rock(c, x, y, s * .85); },
  hay(c, x, y, s) { sh(c, x, y + 8 * s, 16 * s, 6 * s); c.fillStyle = '#d4a017'; c.beginPath(); c.arc(x, y, 14 * s, 0, TAU); c.fill(); c.strokeStyle = '#a67c00'; c.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.arc(x, y, i * 3.5 * s, 0, TAU); c.stroke(); } },
  lily(c, x, y, s) { c.fillStyle = '#2e9b4a'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 14 * s, .4, TAU - .2); c.closePath(); c.fill(); c.strokeStyle = '#1f7a38'; c.lineWidth = 1; c.stroke();
    circ(c, x + 2 * s, y - 1 * s, 4 * s, '#ff8ab5'); circ(c, x + 2 * s, y - 1 * s, 2 * s, '#fff59d'); },
  isle(c, x, y, s) { c.fillStyle = '#f0d890'; c.beginPath(); c.ellipse(x, y + 8 * s, 32 * s, 20 * s, 0, 0, TAU); c.fill(); c.fillStyle = '#e3c677'; c.beginPath(); c.ellipse(x, y + 10 * s, 24 * s, 13 * s, 0, 0, TAU); c.fill(); PROP.palm(c, x - 4 * s, y + 4 * s, s); },
  reed(c, x, y, s) { c.strokeStyle = '#3f8f3f'; c.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 4 * s, y + 8 * s); c.quadraticCurveTo(x + i * 5 * s, y - 4 * s, x + i * 7 * s, y - 14 * s); c.stroke(); c.fillStyle = '#6d4c41'; c.fillRect(x + i * 7 * s - 2, y - 18 * s, 4, 9 * s); } },
  building(c, x, y, s) { const cols = ['#ef9a9a', '#90caf9', '#ffe082', '#ce93d8', '#a5d6a7', '#ffcc80']; const col = cols[(x * 7 + y * 3 | 0) % cols.length]; const w = 30 * s, h = 26 * s;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - w + 5, y - h + 6, w * 2, h * 2); c.fillStyle = col; c.fillRect(x - w, y - h, w * 2, h * 2);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - w + 4, y - h + 4, w * 2 - 8, h * 2 - 8); c.fillStyle = col; c.fillRect(x - w + 8, y - h + 8, w * 2 - 16, h * 2 - 16);
    c.fillStyle = '#607d8b'; c.fillRect(x - 6 * s, y - 5 * s, 12 * s, 10 * s); c.fillStyle = '#cfd8dc'; c.fillRect(x - 4 * s, y - 3 * s, 8 * s, 6 * s); },
  solar(c, x, y, s) { c.save(); c.translate(x, y); c.rotate(-.12); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-24 * s + 4, -16 * s + 5, 48 * s, 32 * s);
    c.fillStyle = '#1e3a8a'; c.fillRect(-24 * s, -16 * s, 48 * s, 32 * s); c.strokeStyle = '#7aa7ff'; c.lineWidth = 1;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-24 * s + i * 12 * s, -16 * s); c.lineTo(-24 * s + i * 12 * s, 16 * s); c.stroke(); }
    c.beginPath(); c.moveTo(-24 * s, 0); c.lineTo(24 * s, 0); c.stroke(); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(-24 * s, -16 * s); c.lineTo(-8 * s, -16 * s); c.lineTo(-24 * s, 0); c.fill(); c.restore(); },
  coral(c, x, y, s) { const cols = ['#ff6f91', '#ff9671', '#f9c74f', '#c77dff']; const col = cols[(x * 3 + y | 0) % 4]; c.strokeStyle = col; c.lineWidth = 4 * s; c.lineCap = 'round';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x, y + 10 * s); c.quadraticCurveTo(x + i * 6 * s, y - 2 * s, x + i * 9 * s, y - 14 * s + Math.abs(i) * 3 * s); c.stroke(); circ(c, x + i * 9 * s, y - 14 * s + Math.abs(i) * 3 * s, 3.5 * s, col); } },
  fan(c, x, y, s) { c.fillStyle = '#b05cd6'; c.beginPath(); c.moveTo(x, y + 10 * s); c.arc(x, y + 10 * s, 20 * s, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); c.fill(); c.strokeStyle = '#7a2fa3'; c.lineWidth = 1;
    for (let i = 0; i <= 6; i++) { const a = Math.PI * 1.1 + i / 6 * Math.PI * .8; c.beginPath(); c.moveTo(x, y + 10 * s); c.lineTo(x + Math.cos(a) * 20 * s, y + 10 * s + Math.sin(a) * 20 * s); c.stroke(); } },
  weed(c, x, y, s) { c.strokeStyle = '#2ecc71'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 5, y + 10 * s); c.bezierCurveTo(x + i * 5 - 6, y, x + i * 5 + 6, y - 8 * s, x + i * 5, y - 16 * s); c.stroke(); } },
  mush(c, x, y, s) { c.fillStyle = '#f5f5dc'; c.fillRect(x - 2 * s, y, 4 * s, 7 * s); c.fillStyle = '#e53935'; c.beginPath(); c.arc(x, y, 9 * s, Math.PI, 0); c.fill(); circ(c, x - 3 * s, y - 4 * s, 1.8 * s, '#fff'); circ(c, x + 3 * s, y - 3 * s, 1.5 * s, '#fff'); },
  iceRock(c, x, y, s) { sh(c, x, y + 6 * s, 14 * s, 5 * s); c.fillStyle = '#8fd3f4'; c.beginPath(); c.moveTo(x - 12 * s, y + 8 * s); c.lineTo(x - 6 * s, y - 14 * s); c.lineTo(x + 2 * s, y - 4 * s); c.lineTo(x + 8 * s, y - 16 * s); c.lineTo(x + 14 * s, y + 8 * s); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x - 6 * s, y - 14 * s); c.lineTo(x - 2 * s, y - 2 * s); c.lineTo(x - 9 * s, y + 4 * s); c.fill(); },
  igloo(c, x, y, s) { sh(c, x, y + 10 * s, 30 * s, 8 * s); c.fillStyle = '#f4fbff'; c.beginPath(); c.arc(x, y + 8 * s, 28 * s, Math.PI, 0); c.fill(); c.strokeStyle = '#b6d7e8'; c.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.arc(x, y + 8 * s, i * 7 * s, Math.PI, 0); c.stroke(); } c.fillStyle = '#5b7f95'; c.beginPath(); c.arc(x, y + 8 * s, 9 * s, Math.PI, 0); c.fill(); },
  snowman(c, x, y, s) { sh(c, x, y + 10 * s, 12 * s, 5 * s); circ(c, x, y + 5 * s, 10 * s, '#fff'); circ(c, x, y - 7 * s, 7 * s, '#fff'); circ(c, x - 2.5 * s, y - 9 * s, 1.2 * s, '#222'); circ(c, x + 2.5 * s, y - 9 * s, 1.2 * s, '#222');
    c.fillStyle = '#ff7043'; c.beginPath(); c.moveTo(x, y - 7 * s); c.lineTo(x + 8 * s, y - 6 * s); c.lineTo(x, y - 5 * s); c.fill(); c.fillStyle = '#c62828'; c.fillRect(x - 8 * s, y - 2 * s, 16 * s, 3 * s); },
  desk(c, x, y, s) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x - 22 * s + 4, y - 14 * s + 4, 44 * s, 28 * s); c.fillStyle = '#a1662f'; c.fillRect(x - 22 * s, y - 14 * s, 44 * s, 28 * s); c.fillStyle = '#c98a4b'; c.fillRect(x - 20 * s, y - 12 * s, 40 * s, 24 * s);
    c.fillStyle = '#e53935'; c.fillRect(x - 12 * s, y - 8 * s, 14 * s, 10 * s); c.fillStyle = '#fff'; c.fillRect(x - 10 * s, y - 6 * s, 10 * s, 6 * s); c.fillStyle = '#fdd835'; c.fillRect(x + 8 * s, y - 8 * s, 3 * s, 14 * s); },
  books(c, x, y, s) { const cs = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa']; sh(c, x, y + 8 * s, 16 * s, 5 * s); for (let i = 0; i < 4; i++) { c.fillStyle = cs[(i + (x | 0)) % 5]; c.fillRect(x - 14 * s + (i % 2) * 3 * s, y + 6 * s - i * 5 * s, 28 * s - (i % 2) * 4 * s, 5 * s); c.fillStyle = '#fff'; c.fillRect(x - 14 * s + (i % 2) * 3 * s + 3, y + 7 * s - i * 5 * s, 20 * s, 1.5); } },
  globe(c, x, y, s) { sh(c, x, y + 14 * s, 14 * s, 5 * s); c.fillStyle = '#6d4c41'; c.fillRect(x - 8 * s, y + 10 * s, 16 * s, 4 * s); circ(c, x, y - 2 * s, 14 * s, '#3b9be0'); c.fillStyle = '#5cbf5c'; c.beginPath(); c.ellipse(x - 4 * s, y - 4 * s, 6 * s, 4 * s, .5, 0, TAU); c.ellipse(x + 5 * s, y + 3 * s, 4 * s, 5 * s, 0, 0, TAU); c.fill(); },
  pencil(c, x, y, s) { c.save(); c.translate(x, y); c.rotate(.6); sh(c, 0, 4, 16 * s, 4 * s); c.fillStyle = '#fdd835'; c.fillRect(-18 * s, -4 * s, 28 * s, 8 * s); c.fillStyle = '#f48fb1'; c.fillRect(-22 * s, -4 * s, 5 * s, 8 * s); c.fillStyle = '#ffe0b2'; c.beginPath(); c.moveTo(10 * s, -4 * s); c.lineTo(20 * s, 0); c.lineTo(10 * s, 4 * s); c.fill(); c.fillStyle = '#333'; c.beginPath(); c.moveTo(17 * s, -1 * s); c.lineTo(20 * s, 0); c.lineTo(17 * s, 1 * s); c.fill(); c.restore(); },
  gear(c, x, y, s) { sh(c, x, y + 6 * s, 20 * s, 6 * s); c.fillStyle = '#607d8b'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.save(); c.translate(x, y); c.rotate(a); c.fillRect(-4 * s, -24 * s, 8 * s, 10 * s); c.restore(); }
    circ(c, x, y, 18 * s, '#78909c'); circ(c, x, y, 7 * s, '#455a64'); circ(c, x, y, 3 * s, '#cfd8dc'); },
  crate(c, x, y, s) { sh(c, x, y + 8 * s, 16 * s, 5 * s); c.fillStyle = '#b8864b'; c.fillRect(x - 14 * s, y - 14 * s, 28 * s, 28 * s); c.strokeStyle = '#7a5429'; c.lineWidth = 2.5; c.strokeRect(x - 14 * s, y - 14 * s, 28 * s, 28 * s);
    c.beginPath(); c.moveTo(x - 14 * s, y - 14 * s); c.lineTo(x + 14 * s, y + 14 * s); c.moveTo(x + 14 * s, y - 14 * s); c.lineTo(x - 14 * s, y + 14 * s); c.stroke(); },
  tank(c, x, y, s) { sh(c, x, y + 8 * s, 20 * s, 6 * s); circ(c, x, y, 20 * s, '#b0bec5'); circ(c, x, y, 16 * s, '#cfd8dc'); circ(c, x - 5 * s, y - 5 * s, 6 * s, 'rgba(255,255,255,.7)'); c.fillStyle = '#e53935'; c.fillRect(x - 3 * s, y - 2 * s, 6 * s, 10 * s); circ(c, x, y - 3 * s, 4 * s, '#c62828'); },
  pipe(c, x, y, s) { c.fillStyle = '#78909c'; c.fillRect(x - 20 * s, y - 5 * s, 40 * s, 10 * s); c.fillStyle = '#b0bec5'; c.fillRect(x - 20 * s, y - 5 * s, 40 * s, 3 * s); c.fillStyle = '#546e7a'; c.fillRect(x - 6 * s, y - 7 * s, 5 * s, 14 * s); c.fillRect(x + 12 * s, y - 7 * s, 5 * s, 14 * s); },
  cactus(c, x, y, s) { sh(c, x, y + 10 * s, 10 * s, 4 * s); c.fillStyle = '#2e8b57'; c.strokeStyle = '#1f6b41'; c.lineWidth = 1; const rr = (a, b, w, h) => { c.beginPath(); c.roundRect ? c.roundRect(a, b, w, h, w / 2) : c.rect(a, b, w, h); c.fill(); c.stroke(); };
    rr(x - 5 * s, y - 16 * s, 10 * s, 28 * s); rr(x - 15 * s, y - 8 * s, 8 * s, 14 * s); rr(x + 7 * s, y - 12 * s, 8 * s, 14 * s); c.fillStyle = '#ff80ab'; circ(c, x, y - 17 * s, 2.5 * s, '#ff80ab'); },
  palm(c, x, y, s) { sh(c, x, y + 12 * s, 14 * s, 5 * s); c.strokeStyle = '#8d5a2b'; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(x, y + 12 * s); c.quadraticCurveTo(x + 4 * s, y - 2 * s, x + 2 * s, y - 16 * s); c.stroke();
    c.fillStyle = '#2e9b4a'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.save(); c.translate(x + 2 * s, y - 16 * s); c.rotate(a); c.beginPath(); c.ellipse(11 * s, 0, 12 * s, 3.5 * s, 0, 0, TAU); c.fill(); c.restore(); } circ(c, x + 2 * s, y - 15 * s, 3 * s, '#6d4c41'); },
  oasis(c, x, y, s) { c.fillStyle = '#7cc46a'; c.beginPath(); c.ellipse(x, y, 40 * s, 28 * s, 0, 0, TAU); c.fill(); c.fillStyle = '#3ab4e8'; c.beginPath(); c.ellipse(x, y + 2 * s, 30 * s, 19 * s, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(x - 8 * s, y - 3 * s, 12 * s, 4 * s, -.2, 0, TAU); c.fill(); PROP.palm(c, x + 24 * s, y - 6 * s, s * .9); PROP.palm(c, x - 26 * s, y - 2 * s, s * .8); },
  olive(c, x, y, s) { sh(c, x, y + 8 * s, 18 * s, 7 * s); c.fillStyle = '#7b5e3b'; c.fillRect(x - 3 * s, y - 2 * s, 6 * s, 12 * s); circ(c, x - 8 * s, y - 4 * s, 11 * s, '#7c9a5b'); circ(c, x + 8 * s, y - 4 * s, 11 * s, '#7c9a5b'); circ(c, x, y - 11 * s, 13 * s, '#8fb06a'); circ(c, x - 4 * s, y - 14 * s, 6 * s, '#b5d18a'); },
  fountain(c, x, y, s) { sh(c, x, y + 10 * s, 36 * s, 12 * s); circ(c, x, y, 32 * s, '#b0bec5'); circ(c, x, y, 27 * s, '#4fc3f7'); circ(c, x, y, 10 * s, '#b0bec5'); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 18 * s, 0, TAU); c.stroke(); circ(c, x, y, 5 * s, '#e1f5fe'); },
  flag(c, x, y, s) { const col = ODSC[(Math.abs(x * 13 + y * 7) | 0) % 17]; c.fillStyle = '#cfd8dc'; c.fillRect(x - 1.5, y - 22 * s, 3, 34 * s); c.fillStyle = col; c.beginPath(); c.moveTo(x + 1.5, y - 22 * s); c.lineTo(x + 20 * s, y - 17 * s); c.lineTo(x + 1.5, y - 8 * s); c.fill(); circ(c, x, y - 23 * s, 3, '#ffd54a'); },
  statue(c, x, y, s) { sh(c, x, y + 10 * s, 14 * s, 5 * s); c.fillStyle = '#cfd8dc'; c.fillRect(x - 10 * s, y + 2 * s, 20 * s, 10 * s); c.fillStyle = '#eceff1'; c.fillRect(x - 8 * s, y - 14 * s, 16 * s, 16 * s); circ(c, x, y - 18 * s, 6 * s, '#eceff1'); c.fillStyle = '#90a4ae'; c.fillRect(x - 10 * s, y + 8 * s, 20 * s, 2); },
  stall(c, x, y, s) { const col = ODSC[(Math.abs(x * 5 + y * 11) | 0) % 17]; c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x - 30 * s + 5, y - 20 * s + 6, 60 * s, 40 * s); c.fillStyle = '#8d6e63'; c.fillRect(x - 28 * s, y - 6 * s, 56 * s, 24 * s);
    c.fillStyle = '#ffcc80'; for (let i = 0; i < 4; i++) circ(c, x - 18 * s + i * 12 * s, y + 6 * s, 5 * s, ['#e53935', '#fdd835', '#43a047', '#fb8c00'][i]);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : col; c.fillRect(x - 30 * s + i * 7.5 * s, y - 20 * s, 7.5 * s, 18 * s); } },
  barrel(c, x, y, s) { sh(c, x, y + 8 * s, 14 * s, 5 * s); circ(c, x, y, 14 * s, '#8d5a2b'); circ(c, x, y, 10 * s, '#a9743a'); c.strokeStyle = '#4e342e'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 12 * s, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(x - 10 * s, y); c.lineTo(x + 10 * s, y); c.stroke(); },
  crateF(c, x, y, s) { PROP.crate(c, x, y, s); circ(c, x - 6 * s, y - 4 * s, 5 * s, '#ef5350'); circ(c, x + 5 * s, y - 5 * s, 5 * s, '#ffa726'); circ(c, x, y + 3 * s, 5 * s, '#66bb6a'); },
  pillar(c, x, y, s) { sh(c, x, y + 10 * s, 14 * s, 5 * s); c.fillStyle = '#e8eaf6'; c.fillRect(x - 12 * s, y + 4 * s, 24 * s, 7 * s); circ(c, x, y - 2 * s, 11 * s, '#f5f7ff'); c.strokeStyle = '#b9bfd9'; c.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 4 * s, y - 12 * s); c.lineTo(x + i * 4 * s, y + 6 * s); c.stroke(); } circ(c, x, y - 2 * s, 4 * s, '#d6dbf5'); }
};

function drawFeature(c, th, R) {
  const f = th.feat;
  if (f === 'fields') for (let i = 0; i < 9; i++) { const x = R() * W, y = R() * H, w = 90 + R() * 80, h = 50 + R() * 50; c.fillStyle = ['#c9b24f', '#7fb04a', '#b5c75a'][i % 3]; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2; for (let k = 6; k < w; k += 9) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k, y + h); c.stroke(); } }
  else if (f === 'ripples') for (let i = 0; i < 60; i++) { c.strokeStyle = 'rgba(255,255,255,' + (.1 + R() * .2) + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(R() * W, R() * H, 6 + R() * 14, 0, Math.PI); c.stroke(); }
  else if (f === 'blocks') { c.fillStyle = '#cfd8dc'; for (let i = 0; i < 14; i++) c.fillRect(R() * W - 40, R() * H - 40, 80 + R() * 60, 60 + R() * 40); c.strokeStyle = 'rgba(255,255,255,.4)'; for (let x = 0; x < W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } }
  else if (f === 'caustics') for (let i = 0; i < 70; i++) { c.strokeStyle = 'rgba(190,240,255,' + (.06 + R() * .12) + ')'; c.lineWidth = 2; const x = R() * W, y = R() * H; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 20, y - 15, x + 40, y + 15, x + 60, y); c.stroke(); }
  else if (f === 'moss') for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(20,70,25,' + (.12 + R() * .15) + ')'; c.beginPath(); c.ellipse(R() * W, R() * H, 20 + R() * 40, 12 + R() * 25, R() * 3, 0, TAU); c.fill(); }
  else if (f === 'icepatch') for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(150,210,240,' + (.25 + R() * .25) + ')'; c.beginPath(); c.ellipse(R() * W, R() * H, 30 + R() * 50, 18 + R() * 30, R() * 3, 0, TAU); c.fill(); }
  else if (f === 'tiles') for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) { c.fillStyle = ((x + y) / 40) % 2 ? 'rgba(255,255,255,.35)' : 'rgba(180,120,40,.08)'; c.fillRect(x, y, 40, 40); }
  else if (f === 'plates') { c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2; for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x += 64) { c.strokeRect(x, y, 64, 64); c.fillStyle = 'rgba(0,0,0,.25)'; for (const [a, b] of [[6, 6], [58, 6], [6, 58], [58, 58]]) { c.beginPath(); c.arc(x + a, y + b, 2, 0, TAU); c.fill(); } }
    for (let i = 0; i < 4; i++) { const x = R() * (W - 120), y = R() * (H - 40); c.save(); c.beginPath(); c.rect(x, y, 100, 18); c.clip(); c.fillStyle = '#f5c518'; c.fillRect(x, y, 100, 18); c.fillStyle = '#222'; for (let k = -20; k < 120; k += 24) { c.beginPath(); c.moveTo(x + k, y + 18); c.lineTo(x + k + 12, y + 18); c.lineTo(x + k + 30, y); c.lineTo(x + k + 18, y); c.fill(); } c.restore(); } }
  else if (f === 'dunes') for (let i = 0; i < 30; i++) { const x = R() * W, y = R() * H, r = 40 + R() * 70; c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95); c.arc(x + 14, y + 6, r * .9, Math.PI * 1.95, Math.PI * 1.05, true); c.fill(); }
  else if (f === 'meadow') for (let i = 0; i < 140; i++) { circ(c, R() * W, R() * H, 2 + R() * 1.5, ['#fff', '#ffeb3b', '#ff80ab', '#b39ddb'][i % 4]); }
  else if (f === 'cobbles') for (let i = 0; i < 420; i++) { c.fillStyle = 'rgba(120,70,30,' + (.08 + R() * .1) + ')'; c.beginPath(); c.ellipse(R() * W, R() * H, 8 + R() * 6, 6 + R() * 4, R(), 0, TAU); c.fill(); }
  else if (f === 'rings') { for (let i = 1; i < 8; i++) { c.strokeStyle = 'rgba(255,255,255,' + (.05 + i * .01) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(480, 320, i * 70, 0, TAU); c.stroke(); } for (let i = 0; i < 80; i++) circ(c, R() * W, R() * H, .8 + R() * 1.6, 'rgba(255,255,255,' + (.3 + R() * .5) + ')'); }
}
function drawPathDeco(c, th, bp) {
  const pd = th.pd;
  for (const p of bp.paths) {
    const pts = p.pts;
    for (let i = 3; i < p.n - 3; i += (pd === 'plank' ? 4 : pd === 'belt' ? 5 : pd === 'road' ? 5 : 3)) {
      const a = pts[i - 2], b = pts[i + 2], x = pts[i][0], y = pts[i][1];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, hw = PATHW / 2;
      if (pd === 'plank') { c.strokeStyle = 'rgba(70,40,15,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + nx * hw, y + ny * hw); c.lineTo(x - nx * hw, y - ny * hw); c.stroke(); }
      else if (pd === 'road') { if (((i / 5) | 0) % 2 === 0) { c.strokeStyle = '#ffd54a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - dx / l * 4, y - dy / l * 4); c.lineTo(x + dx / l * 4, y + dy / l * 4); c.stroke(); } }
      else if (pd === 'belt') { c.strokeStyle = 'rgba(245,197,24,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + nx * hw * .9 - dx / l * 3, y + ny * hw * .9 - dy / l * 3); c.lineTo(x + nx * hw * .9 + dx / l * 3, y + ny * hw * .9 + dy / l * 3); c.moveTo(x - nx * hw * .9 - dx / l * 3, y - ny * hw * .9 - dy / l * 3); c.lineTo(x - nx * hw * .9 + dx / l * 3, y - ny * hw * .9 + dy / l * 3); c.stroke();
        if (((i / 5) | 0) % 3 === 0) { c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + nx * 8 - dx / l * 4, y + ny * 8 - dy / l * 4); c.lineTo(x + dx / l * 4, y + dy / l * 4); c.lineTo(x - nx * 8 - dx / l * 4, y - ny * 8 - dy / l * 4); c.stroke(); } }
      else if (pd === 'carpet') { if (i % 6 === 0) { c.strokeStyle = 'rgba(255,215,64,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + nx * (hw - 5), y + ny * (hw - 5)); c.lineTo(x + nx * (hw - 5) + dx / l * 2, y + ny * (hw - 5) + dy / l * 2); c.moveTo(x - nx * (hw - 5), y - ny * (hw - 5)); c.lineTo(x - nx * (hw - 5) + dx / l * 2, y - ny * (hw - 5) + dy / l * 2); c.stroke(); } }
      else if (pd === 'gold') { if (i % 6 === 0) { c.fillStyle = 'rgba(255,193,7,.8)'; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); } }
      else if (pd === 'stone' || pd === 'cobble') { if (i % 6 === 0) { c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + nx * hw, y + ny * hw); c.lineTo(x - nx * hw, y - ny * hw); c.stroke(); } if (pd === 'cobble' && i % 3 === 0) { circ(c, x + nx * 8, y + ny * 8, 3, 'rgba(0,0,0,.14)'); circ(c, x - nx * 9, y - ny * 9, 3, 'rgba(255,255,255,.12)'); } }
      else if (pd === 'dirt' || pd === 'sand' || pd === 'snow') { const o = ((i * 7919) % 100) / 100 - .5; circ(c, x + nx * o * hw * 1.4, y + ny * o * hw * 1.4, 1.6 + (i % 3) * .5, pd === 'snow' ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.14)'); }
    }
  }
}
function renderBG(def, bp) {
  const th = TH[def.theme], R = mulberry32(def.seed * 977 + 13), c0 = newCanvas(W, H), c = c0.getContext('2d');
  const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, th.g[0]); gr.addColorStop(1, th.g[1]); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { c.fillStyle = th.sp[i % 3]; c.globalAlpha = .35; c.beginPath(); c.ellipse(R() * W, R() * H, 2 + R() * 6, 1 + R() * 3, R() * 3, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  drawFeature(c, th, R);
  // camino
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const [w, col, al] of [[PATHW + 12, th.path[1], 1], [PATHW, th.path[0], 1], [PATHW - 16, th.path[2], .35]]) {
    c.strokeStyle = col; c.globalAlpha = al; c.lineWidth = w;
    for (const p of bp.paths) { c.beginPath(); p.pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); }
  }
  c.globalAlpha = 1;
  drawPathDeco(c, th, bp);
  // decoración pequeña
  for (let i = 0; i < 160; i++) { const x = R() * W, y = R() * H; if (gridBlocked(bp, x, y)) continue; c.fillStyle = th.sp[(R() * 3) | 0]; c.globalAlpha = .7; c.beginPath(); c.arc(x, y, 1.5 + R() * 2.5, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  // props / obstáculos
  const placed = [], tot = th.props.reduce((a, p) => a + p[1], 0);
  let tries = 0;
  while (placed.length < th.n && tries++ < 900) {
    let r = R() * tot, name = th.props[0][0];
    for (const p of th.props) { r -= p[1]; if (r <= 0) { name = p[0]; break; } }
    const s = .85 + R() * .35, rad = RAD[name] * s, x = 28 + R() * (W - 56), y = 34 + R() * (H - 60);
    if (gridBlocked(bp, x, y) || gridBlocked(bp, x - rad * .6, y) || gridBlocked(bp, x + rad * .6, y) || gridBlocked(bp, x, y - rad * .6) || gridBlocked(bp, x, y + rad * .6)) continue;
    if (x < rad || x > W - rad || y < rad || y > H - rad) continue;
    if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < o.rad + rad - 4)) continue;
    placed.push({ name, x, y, s, rad });
  }
  placed.sort((a, b) => a.y - b.y);
  for (const o of placed) { PROP[o.name](c, o.x, o.y, o.s); bp.obs.push({ x: o.x, y: o.y, r: o.rad * .75 }); }
  // viñeta
  const v = c.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,20,.28)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  return c0;
}
function makeAmbient(theme) {
  const k = TH[theme].amb, n = k === 'snow' ? 70 : 36, a = [];
  for (let i = 0; i < n; i++) a.push({ k, x: Math.random() * W, y: Math.random() * H, vx: rnd(-8, 8), vy: k === 'snow' ? rnd(14, 34) : k === 'bubble' ? -rnd(14, 36) : k === 'smoke' ? -rnd(10, 22) : rnd(-6, 6), s: rnd(1.5, 4), ph: rnd(0, 6.28) });
  return a;
}
function updAmbient(a, dt, t) {
  for (const p of a) { p.x += (p.vx + Math.sin(t + p.ph) * 6) * dt; p.y += p.vy * dt; if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10; if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; }
}
function drawAmbient(c, a, t) {
  for (const p of a) {
    const tw = .5 + .5 * Math.sin(t * 2 + p.ph);
    if (p.k === 'snow') { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(p.x, p.y, p.s * .7, 0, TAU); c.fill(); }
    else if (p.k === 'bubble') { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.s * 1.4, 0, TAU); c.stroke(); }
    else if (p.k === 'firefly') { c.fillStyle = 'rgba(255,240,120,' + (.2 + tw * .7) + ')'; c.beginPath(); c.arc(p.x, p.y, p.s * .8, 0, TAU); c.fill(); }
    else if (p.k === 'sparkle' || p.k === 'star') { c.fillStyle = 'rgba(255,255,255,' + (.15 + tw * .6) + ')'; c.fillRect(p.x - 1, p.y - 1, 2.4, 2.4); }
    else if (p.k === 'smoke') { c.fillStyle = 'rgba(60,60,60,.12)'; c.beginPath(); c.arc(p.x, p.y, p.s * 4, 0, TAU); c.fill(); }
    else if (p.k === 'leaf') { c.fillStyle = 'rgba(80,160,60,.55)'; c.save(); c.translate(p.x, p.y); c.rotate(t + p.ph); c.beginPath(); c.ellipse(0, 0, p.s * 1.6, p.s * .8, 0, 0, TAU); c.fill(); c.restore(); }
    else { c.fillStyle = 'rgba(255,230,180,.25)'; c.beginPath(); c.arc(p.x, p.y, p.s * .6, 0, TAU); c.fill(); }
  }
}

/* ---------- Sprites de enemigos (problemas) ---------- */
function face(c, x, y, s) {
  c.lineWidth = Math.max(1, s * .12); c.strokeStyle = '#222';
  for (const sx of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x + sx * s * .5, y, s * .38, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#111'; c.beginPath(); c.arc(x + sx * s * .45, y + s * .06, s * .17, 0, TAU); c.fill(); }
  c.lineWidth = s * .16; c.beginPath(); c.moveTo(x - s * .95, y - s * .62); c.lineTo(x - s * .15, y - s * .3); c.moveTo(x + s * .95, y - s * .62); c.lineTo(x + s * .15, y - s * .3); c.stroke();
}
function cloud(c, R, base, hi, n) {
  c.fillStyle = base; const pts = [[-.5, .25, .5], [.5, .25, .5], [0, -.1, .62], [-.55, -.1, .4], [.55, -.1, .4], [0, .3, .55]];
  for (const [x, y, r] of pts) { c.beginPath(); c.arc(x * R, y * R, r * R, 0, TAU); c.fill(); }
  c.fillStyle = hi; c.beginPath(); c.arc(-.2 * R, -.35 * R, .3 * R, 0, TAU); c.fill();
}
const ESPR = {
  bolsa(c, R) { c.fillStyle = 'rgba(236,246,255,.97)'; c.strokeStyle = '#8fa4b3'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-R * .6, -R * .45); c.quadraticCurveTo(-R * 1, R * .2, -R * .55, R * .9); c.lineTo(R * .55, R * .9); c.quadraticCurveTo(R * 1, R * .2, R * .6, -R * .45); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(-R * .32, -R * .5, R * .3, Math.PI, 0); c.arc(R * .32, -R * .5, R * .3, Math.PI, 0); c.stroke(); c.strokeStyle = 'rgba(140,160,175,.5)'; c.lineWidth = 1; for (const x of [-.6, .6]) { c.beginPath(); c.moveTo(R * x * .8, -R * .2); c.lineTo(R * x * .9, R * .7); c.stroke(); } face(c, 0, R * .2, R * .3); },
  colilla(c, R) { c.rotate(-.25); c.fillStyle = '#e8a33d'; c.fillRect(-R * .35, R * .05, R * .7, R * .85); c.strokeStyle = '#a56a14'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-R * .35, R * (.2 + i * .2)); c.lineTo(R * .35, R * (.2 + i * .2)); c.stroke(); }
    c.fillStyle = '#fafafa'; c.fillRect(-R * .35, -R * .6, R * .7, R * .65); c.fillStyle = '#555'; c.beginPath(); c.moveTo(-R * .35, -R * .6); c.lineTo(-R * .2, -R * .85); c.lineTo(R * .1, -R * .7); c.lineTo(R * .35, -R * .85); c.lineTo(R * .35, -R * .6); c.fill();
    c.strokeStyle = 'rgba(120,120,120,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -R * .9); c.quadraticCurveTo(R * .3, -R * 1.05, 0, -R * 1.2); c.stroke(); c.rotate(.25); face(c, 0, -R * .15, R * .22); },
  botella(c, R) { c.fillStyle = 'rgba(100,181,246,.9)'; c.strokeStyle = '#1565c0'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-R * .22, -R * .6); c.lineTo(-R * .22, -R * .35); c.quadraticCurveTo(-R * .6, -R * .15, -R * .55, R * .15); c.lineTo(-R * .55, R * .8); c.quadraticCurveTo(-R * .55, R * .95, -R * .4, R * .95); c.lineTo(R * .4, R * .95); c.quadraticCurveTo(R * .55, R * .95, R * .55, R * .8); c.lineTo(R * .55, R * .15); c.quadraticCurveTo(R * .6, -R * .15, R * .22, -R * .35); c.lineTo(R * .22, -R * .6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e53935'; c.fillRect(-R * .26, -R * .85, R * .52, R * .27); c.fillStyle = '#fff'; c.fillRect(-R * .55, R * .15, R * 1.1, R * .38); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-R * .4, -R * .1, R * .1, R * .6); face(c, 0, R * .34, R * .17); },
  lata(c, R) { c.fillStyle = '#cfd8dc'; c.strokeStyle = '#78909c'; c.lineWidth = 1.5; c.beginPath(); c.rect(-R * .55, -R * .65, R * 1.1, R * 1.4); c.fill(); c.stroke(); c.fillStyle = '#e53935'; c.fillRect(-R * .55, -R * .3, R * 1.1, R * .8); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-R * .55, R * .05); c.quadraticCurveTo(-R * .2, -R * .25, 0, R * .05); c.quadraticCurveTo(R * .2, R * .35, R * .55, R * .05); c.lineTo(R * .55, R * .2); c.quadraticCurveTo(R * .2, R * .5, 0, R * .2); c.quadraticCurveTo(-R * .2, -R * .1, -R * .55, R * .2); c.fill();
    c.fillStyle = '#b0bec5'; c.beginPath(); c.ellipse(0, -R * .65, R * .55, R * .16, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#90a4ae'; c.fillRect(-R * .12, -R * .7, R * .24, R * .08); face(c, 0, -R * .1, R * .17); },
  humo(c, R) { cloud(c, R, '#78909c', '#b0bec5'); c.fillStyle = '#263238'; c.font = 'bold ' + Math.round(R * .6) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CO₂', 0, R * .5); face(c, 0, -R * .08, R * .24); },
  barril(c, R) { c.fillStyle = '#263238'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-R * .6, -R * .8); c.quadraticCurveTo(-R * .85, 0, -R * .6, R * .85); c.lineTo(R * .6, R * .85); c.quadraticCurveTo(R * .85, 0, R * .6, -R * .8); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#546e7a'; c.lineWidth = 2; for (const y of [-.5, .5]) { c.beginPath(); c.moveTo(-R * .75, R * y); c.lineTo(R * .75, R * y); c.stroke(); }
    c.fillStyle = '#fbc02d'; c.beginPath(); c.moveTo(0, -R * .35); c.quadraticCurveTo(R * .3, R * .05, 0, R * .2); c.quadraticCurveTo(-R * .3, R * .05, 0, -R * .35); c.fill(); face(c, 0, -R * .55, R * .2); },
  micro(c, R) { c.fillStyle = 'rgba(200,235,255,.45)'; c.strokeStyle = '#7fb8d9'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, R * .95, 0, TAU); c.fill(); c.stroke();
    const cols = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#ab47bc', '#fb8c00']; for (let i = 0; i < 14; i++) { const a = i * 2.4, r = ((i * 37) % 60) / 100 * R + R * .1; c.fillStyle = cols[i % 6]; c.fillRect(Math.cos(a) * r - 2, Math.sin(a) * r - 2, 4, 4); }
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-R * .4, -R * .5, R * .25, R * .12, -.6, 0, TAU); c.fill(); face(c, 0, R * .05, R * .22); },
  plomo(c, R) { c.fillStyle = '#7cb342'; c.strokeStyle = '#33691e'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * .7, -R * .75); c.lineTo(R * .7, -R * .75); c.lineTo(R * .75, R * .8); c.lineTo(-R * .75, R * .8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fdd835'; c.fillRect(-R * .72, -R * .15, R * 1.44, R * .5); c.fillStyle = '#212121'; c.font = 'bold ' + Math.round(R * .75) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('☣', 0, R * .1); c.fillStyle = '#558b2f'; c.fillRect(-R * .7, -R * .75, R * 1.4, R * .18); face(c, 0, -R * .42, R * .17); },
  tala(c, R) { c.fillStyle = '#6d4c41'; c.strokeStyle = '#3e2723'; c.lineWidth = 1.5; c.beginPath(); c.roundRect ? c.roundRect(-R * .95, -R * .55, R * 1.9, R * 1.1, R * .3) : c.rect(-R * .95, -R * .55, R * 1.9, R * 1.1); c.fill(); c.stroke();
    c.fillStyle = '#e0b878'; c.beginPath(); c.ellipse(R * .7, 0, R * .3, R * .55, 0, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = '#a67c3d'; c.lineWidth = 1; for (const k of [.2, .4]) { c.beginPath(); c.ellipse(R * .7, 0, R * .3 * k * 2, R * .55 * k * 2, 0, 0, TAU); c.stroke(); }
    c.strokeStyle = '#4e342e'; c.lineWidth = 1.5; for (const y of [-.25, .1, .3]) { c.beginPath(); c.moveTo(-R * .8, R * y); c.lineTo(R * .2, R * y); c.stroke(); } face(c, -R * .25, -R * .05, R * .22); },
  smog(c, R) { cloud(c, R, '#5d4a6b', '#8e7a9c'); c.fillStyle = 'rgba(30,0,40,.35)'; c.beginPath(); c.arc(R * .3, R * .35, R * .45, 0, TAU); c.fill(); c.fillStyle = '#ff5252'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * R * .3, -R * .05, R * .12, 0, TAU); c.fill(); } c.strokeStyle = '#111'; c.lineWidth = R * .1; c.beginPath(); c.moveTo(-R * .5, -R * .3); c.lineTo(-R * .1, -R * .15); c.moveTo(R * .5, -R * .3); c.lineTo(R * .1, -R * .15); c.stroke();
    c.fillStyle = '#fafafa'; c.beginPath(); c.moveTo(-R * .3, R * .25); for (let i = 0; i <= 6; i++) c.lineTo(-R * .3 + i * R * .1, R * (.25 + (i % 2 ? .15 : 0))); c.lineTo(R * .3, R * .25); c.fill(); },
  corrup(c, R) { c.fillStyle = '#4caf50'; c.strokeStyle = '#1b5e20'; c.lineWidth = 1; for (let i = -1; i <= 1; i++) { c.save(); c.rotate(i * .25); c.fillRect(-R * .28, -R * 1.05, R * .56, R * .6); c.strokeRect(-R * .28, -R * 1.05, R * .56, R * .6); c.restore(); }
    c.fillStyle = '#6d4c41'; c.strokeStyle = '#3e2723'; c.lineWidth = 1.8; c.beginPath(); c.roundRect ? c.roundRect(-R * .95, -R * .5, R * 1.9, R * 1.3, R * .15) : c.rect(-R * .95, -R * .5, R * 1.9, R * 1.3); c.fill(); c.stroke();
    c.fillStyle = '#8d6e63'; c.fillRect(-R * .3, -R * .75, R * .6, R * .25); c.fillStyle = '#ffd54a'; c.fillRect(-R * .17, -R * .08, R * .34, R * .28); c.fillStyle = '#212121'; c.font = 'bold ' + Math.round(R * .6) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', -R * .55, R * .45); c.fillText('$', R * .55, R * .45); face(c, 0, -R * .1, R * .2); },
  fake(c, R) { c.rotate(-.1); c.fillStyle = '#f5f0e1'; c.strokeStyle = '#333'; c.lineWidth = 1.8; c.beginPath(); c.rect(-R * .85, -R * .8, R * 1.7, R * 1.6); c.fill(); c.stroke(); c.fillStyle = '#222'; c.fillRect(-R * .7, -R * .65, R * 1.4, R * .28); c.fillStyle = '#999'; for (let i = 0; i < 4; i++) c.fillRect(-R * .7, -R * .15 + i * R * .22, R * (i % 2 ? 1 : 1.4), R * .1);
    c.fillStyle = '#d50000'; c.save(); c.rotate(-.3); c.font = 'bold ' + Math.round(R * .75) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#d50000'; c.lineWidth = 2; c.strokeRect(-R * .75, -R * .02, R * 1.5, R * .7); c.fillText('FAKE', 0, R * .33); c.restore(); face(c, 0, -R * .45, R * .15); },
  fabrica(c, R) { c.fillStyle = 'rgba(80,80,80,.55)'; for (const [x, y, r] of [[-.45, -1.1, .3], [-.3, -1.35, .35], [.35, -1.15, .3], [.5, -1.4, .38]]) { c.beginPath(); c.arc(x * R, y * R, r * R, 0, TAU); c.fill(); }
    c.fillStyle = '#546e7a'; c.fillRect(-R * .65, -R * .95, R * .28, R * .7); c.fillRect(R * .25, -R * .95, R * .28, R * .7); c.fillStyle = '#b71c1c'; c.fillRect(-R * .65, -R * .95, R * .28, R * .12); c.fillRect(R * .25, -R * .95, R * .28, R * .12);
    c.fillStyle = '#78909c'; c.strokeStyle = '#37474f'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 1.05, R * .75); c.lineTo(-R * 1.05, -R * .1); c.lineTo(-R * .55, -R * .35); c.lineTo(-R * .55, -R * .1); c.lineTo(-R * .05, -R * .35); c.lineTo(-R * .05, -R * .1); c.lineTo(R * .45, -R * .35); c.lineTo(R * .45, -R * .1); c.lineTo(R * 1.05, -R * .1); c.lineTo(R * 1.05, R * .75); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffd54a'; for (let i = 0; i < 5; i++) c.fillRect(-R * .85 + i * R * .4, R * .1, R * .22, R * .22); c.fillStyle = '#37474f'; c.fillRect(-R * .2, R * .45, R * .4, R * .3); },
  petro(c, R) { c.fillStyle = '#1a237e'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * 1.1, 0); c.lineTo(R * 1.2, 0); c.lineTo(R * .95, R * .6); c.lineTo(-R * .85, R * .6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#c62828'; c.fillRect(-R * 1.0, -R * .05, R * 2.0, R * .12);
    const cc = ['#fb8c00', '#43a047', '#1e88e5', '#fdd835', '#e53935']; for (let i = 0; i < 5; i++) { c.fillStyle = cc[i]; c.fillRect(-R * .95 + i * R * .32, -R * .35, R * .3, R * .32); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.strokeRect(-R * .95 + i * R * .32, -R * .35, R * .3, R * .32); }
    c.fillStyle = '#eceff1'; c.fillRect(R * .65, -R * .6, R * .4, R * .6); c.fillStyle = '#4fc3f7'; c.fillRect(R * .72, -R * .5, R * .26, R * .15); c.fillStyle = '#212121'; c.fillRect(R * .78, -R * .85, R * .12, R * .28);
    c.fillStyle = '#111'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-R * .6 + i * R * .5, R * .66, R * .09, 0, TAU); c.fill(); c.fillRect(-R * .6 + i * R * .5 - 1.5, R * .6, 3, R * .15); } },
  clima(c, R) { c.fillStyle = '#ff6d00'; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; c.save(); c.rotate(a); c.beginPath(); c.moveTo(R * .8, -R * .13); c.quadraticCurveTo(R * 1.15, -R * .1, R * 1.25 + (i % 2) * R * .12, 0); c.quadraticCurveTo(R * 1.15, R * .1, R * .8, R * .13); c.fill(); c.restore(); }
    c.fillStyle = '#ffd600'; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + .1; c.save(); c.rotate(a); c.beginPath(); c.moveTo(R * .8, -R * .06); c.lineTo(R * 1.02, 0); c.lineTo(R * .8, R * .06); c.fill(); c.restore(); }
    const g = c.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R * .95); g.addColorStop(0, '#4fc3f7'); g.addColorStop(1, '#0d47a1'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * .88, 0, TAU); c.fill();
    c.fillStyle = '#4caf50'; c.beginPath(); c.ellipse(-R * .35, -R * .3, R * .3, R * .22, .4, 0, TAU); c.ellipse(R * .35, R * .3, R * .28, R * .32, -.2, 0, TAU); c.ellipse(R * .4, -R * .35, R * .16, R * .1, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,60,0,.25)'; c.beginPath(); c.arc(0, 0, R * .88, 0, TAU); c.fill(); face(c, 0, -R * .02, R * .3); c.fillStyle = '#111'; c.beginPath(); c.arc(0, R * .5, R * .2, Math.PI, 0); c.fill(); }
};
const SPR = {};
function enemySprite(t, camo) {
  const k = t + (camo ? 'c' : '');
  if (SPR[k]) return SPR[k];
  const R = E[t].r, size = Math.ceil(R * 3.2 + 12), cv = newCanvas(size, size), c = cv.getContext('2d');
  c.translate(size / 2, size / 2); c.lineJoin = 'round';
  c.save(); c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(2, R * .95, R * .8, R * .25, 0, 0, TAU); c.fill(); c.restore();
  if (camo) c.globalAlpha = .5;
  ESPR[t](c, R);
  if (camo) { c.globalAlpha = .9; c.strokeStyle = '#3d5a2a'; c.setLineDash([3, 3]); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, R * 1.05, 0, TAU); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(70,100,40,.5)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(Math.cos(i * 1.7) * R * .55, Math.sin(i * 2.3) * R * .55, R * .16, 0, TAU); c.fill(); } }
  SPR[k] = cv; return cv;
}

/* ---------- Sprites de torres ---------- */
const TSPR = {};
function towerSprite(def) {
  if (TSPR[def.id]) return TSPR[def.id];
  const cv = newCanvas(64, 64), c = cv.getContext('2d'); c.translate(32, 32);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(2, 17, 19, 7, 0, 0, TAU); c.fill();
  const g = c.createRadialGradient(-6, -8, 2, 0, 0, 22); g.addColorStop(0, '#fff'); g.addColorStop(.25, def.col); g.addColorStop(1, def.col);
  c.fillStyle = def.col; c.beginPath(); c.arc(0, 0, 19, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(0, -5, 14, Math.PI, 0); c.fill();
  c.lineWidth = 3.5; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, 19, 0, TAU); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(0, 0, 21.5, 0, TAU); c.stroke();
  c.font = '21px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(def.emoji, 0, 2);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-15, -15, 8, 0, TAU); c.fill(); c.strokeStyle = def.col; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#111'; c.font = 'bold 10px sans-serif'; c.fillText(def.ods ? String(def.ods) : '★', -15, -14.5);
  TSPR[def.id] = cv; return cv;
}

/* ---------- Dibujo de proyectiles ---------- */
function drawProj(c, p, t) {
  const a = Math.atan2(p.vy, p.vx);
  c.save(); c.translate(p.x, p.y);
  switch (p.vis) {
    case 'seed': c.rotate(a); c.fillStyle = '#8d5a1f'; c.beginPath(); c.ellipse(0, 0, 6.5, 3.6, 0, 0, TAU); c.fill(); c.fillStyle = '#f2c14e'; c.beginPath(); c.ellipse(-1, -1, 4, 1.6, 0, 0, TAU); c.fill(); c.strokeStyle = '#5d3a10'; c.lineWidth = .8; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); break;
    case 'pill': c.rotate(a); c.fillStyle = '#fff'; c.beginPath(); c.roundRect ? c.roundRect(-8, -3.4, 16, 6.8, 3.4) : c.rect(-8, -3.4, 16, 6.8); c.fill(); c.fillStyle = '#e53935'; c.beginPath(); c.roundRect ? c.roundRect(0, -3.4, 8, 6.8, 3.4) : c.rect(0, -3.4, 8, 6.8); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-6, -2.6, 10, 1.4); c.strokeStyle = '#7a1b1b'; c.lineWidth = .8; c.beginPath(); c.roundRect ? c.roundRect(-8, -3.4, 16, 6.8, 3.4) : c.rect(-8, -3.4, 16, 6.8); c.stroke(); break;
    case 'book': c.rotate(t * 14 + p.ph); c.fillStyle = '#c62828'; c.fillRect(-8, -6, 16, 12); c.fillStyle = '#fff8e1'; c.fillRect(-6, -5, 14, 10); c.fillStyle = '#8e0000'; c.fillRect(-8, -6, 3, 12); c.strokeStyle = '#bbb'; c.lineWidth = .8; for (let i = -2; i < 4; i += 2) { c.beginPath(); c.moveTo(-3, i); c.lineTo(6, i); c.stroke(); } break;
    case 'orb': { const g = c.createRadialGradient(0, 0, 1, 0, 0, 10); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#ff80ab'); g.addColorStop(1, 'rgba(255,58,33,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3.2, 0, TAU); c.fill(); break; }
    case 'drop': c.rotate(a + Math.PI / 2); c.fillStyle = '#4fc3f7'; c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(5, 1, 0, 5); c.quadraticCurveTo(-5, 1, 0, -6); c.fill(); break;
    case 'bomb': c.fillStyle = '#212121'; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-2.5, -3, 2.6, 0, TAU); c.fill(); c.strokeStyle = '#8d6e63'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(3, -6); c.quadraticCurveTo(6, -11, 9, -9); c.stroke(); c.fillStyle = Math.sin(t * 40) > 0 ? '#ffeb3b' : '#ff6f00'; c.beginPath(); c.arc(9, -9, 2.6, 0, TAU); c.fill(); break;
    case 'minibomb': c.fillStyle = '#37474f'; c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.fill(); c.fillStyle = '#ffb300'; c.beginPath(); c.arc(2, -4, 1.6, 0, TAU); c.fill(); break;
    case 'disc': c.rotate(t * 12 + p.ph); c.fillStyle = '#2e9b4a'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.stroke(); c.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * TAU / 3); c.beginPath(); c.moveTo(0, -6); c.lineTo(3, -2); c.lineTo(-3, -2); c.fill(); c.restore(); } c.fillStyle = '#1b6b32'; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill(); break;
    case 'bubble': c.fillStyle = 'rgba(100,200,255,.35)'; c.strokeStyle = 'rgba(210,245,255,.95)'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(-2.5, -2.5, 2.2, 0, TAU); c.fill(); break;
    case 'dove': { const fl = Math.sin(t * 22 + p.ph) * .7; c.rotate(a); c.fillStyle = '#fff'; c.strokeStyle = '#90a4ae'; c.lineWidth = .8; c.beginPath(); c.ellipse(0, 0, 7, 3.4, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(6.5, -1, 2.6, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ffb300'; c.beginPath(); c.moveTo(9, -1.4); c.lineTo(12, -.6); c.lineTo(9, 0); c.fill();
      c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.save(); c.rotate(s * (.9 + fl)); c.beginPath(); c.ellipse(-2, s * 5, 6, 2.6, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); } break; }
    default: c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill();
  }
  c.restore();
}
