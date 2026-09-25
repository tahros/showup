/* ShowUp -- gym-tour.js (v4.6.135): the gym film, as a secret.
   Three taps on the Today mascot open it full screen (js/mascot.js); any tap
   closes it. The maker's film "ShowUp Gym Tour 2" -- twelve US gyms, one per
   month, the mascot closing a month with every jump -- embedded unchanged
   except that it draws into the canvas it is given and can be stopped. A
   160x90 palette framebuffer blitted at the largest whole scale that fits, so
   it is sharp at any size and reflows on rotation without restarting.
   Loaded only when opened (dynamic import); cached for offline by sw.js.
   Decorative: no data is read or written. */
export function playGymTour(screen) {
'use strict';

/* ------------------------------------------------------------------ *
 *  Fixed logical resolution. Everything is drawn as palette indices   *
 *  into a 160x90 byte framebuffer, converted to RGBA once per frame,  *
 *  then blitted at the largest integer scale that fits.               *
 * ------------------------------------------------------------------ */
const W = 160, H = 90, FLOOR = 74, CX = 80;
const STEP = 1000 / 60;          // fixed update rate
const QF = 1000 / 12;            // pose/animation frame (12 fps pixel feel)

/* Timeline of one gym (ms) */
const J = 2200;                  // jump show starts
const JLEN = 2700;               // ShowUp's approved jump length
const T0 = 6000;                 // dissolve to next gym starts
const SCENE_MS = 6800;

/* ---------------------------- palette ----------------------------- */
const HEX = [
  '#000000', // 0  unused
  '#151826', // 1  outline
  '#BFC2C7', '#E6E8EB', '#FFFFFF',   // 2-4   white mascot  (shade / mid / light)
  '#2033AF', '#3049DC', '#5368ED',   // 5-7   ShowUp blue   (shade / mid / light)
  '#303030',                         // 8     face
  '#6A6A6A', '#A2A2A2', '#E6E6E6',   // 9-11  chrome mascot
  '#10131B', '#1B2440', '#2A3A6B', '#4C6BE3', '#8BA5FF', // 12-16 night → sky
  '#F46B52', '#B83528', '#F2A65A', '#FFE3A3', '#6E3A63', // 17-21 coral, red, amber, sun, plum
  '#2E211E', '#7A4130', '#A8683F', '#E3C18C',            // 22-25 brown, brick, wood, sand
  '#183328', '#3E6B48',                                  // 26-27 pine, grass
  '#262830', '#3A3D47', '#5E6270', '#9AA0AE',            // 28-31 steel ramp
  '#1E4F66', '#3FA7B5',                                  // 32-33 sea, teal
  '#7FE3B0'                                              // 34    aurora mint
];
const OUT=1, W_SH=2, W_MID=3, W_LT=4, B_SH=5, B_MID=6, B_LT=7, FACE=8,
      C_SH=9, C_MID=10, C_LT=11, NIGHT=12, NAVY=13, DUSK=14, SKY=15, SKY_LT=16,
      CORAL=17, RED=18, AMBER=19, SUN=20, PLUM=21, BROWN=22, BRICK=23, WOOD=24, SAND=25,
      PINE=26, GRASS=27, CHAR=28, STEEL_D=29, STEEL=30, STEEL_LT=31, SEA=32, TEAL=33, MINT=34;

const PAL32 = new Uint32Array(HEX.length);
for (let i = 0; i < HEX.length; i++) {
  const v = parseInt(HEX[i].slice(1), 16);
  PAL32[i] = (0xFF000000 | ((v & 255) << 16) | (v & 0xFF00) | ((v >> 16) & 255)) >>> 0;
}

/* Mascot tones: slot 1 shade, 2 mid, 3 light, 4 face */
const TONE_CHROME = 0, TONE_WHITE = 1, TONE_BLUE = 2, TONE_FLASH = 3;
const TONES = new Uint8Array([
  0, C_SH, C_MID, C_LT, FACE,
  0, W_SH, W_MID, W_LT, FACE,
  0, B_SH, B_MID, B_LT, W_LT,
  0, W_LT, W_LT, W_LT, B_MID
]);

/* ---------------------------- buffers ----------------------------- */
const fb  = new Uint8Array(W * H);   // current frame (indices)
const fb2 = new Uint8Array(W * H);   // incoming gym during dissolve
const MB  = new Uint8Array(W * H);   // mascot slot mask
const BAYER = new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);

/* ---------------------------- helpers ----------------------------- */
function rng(s) {
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hsh(a, b) {
  let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) | 0, 0xc2b2ae35);
  x ^= x >>> 15; x = Math.imul(x, 0x27d4eb2d); x ^= x >>> 13;
  return x >>> 0;
}
function rect(B, x, y, w, h, c) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  const x0 = x < 0 ? 0 : x, y0 = y < 0 ? 0 : y;
  const x1 = x + w > W ? W : x + w, y1 = y + h > H ? H : y + h;
  for (let j = y0; j < y1; j++) { const o = j * W; for (let i = x0; i < x1; i++) B[o + i] = c; }
}
function px(B, x, y, c) {
  x = Math.floor(x); y = Math.floor(y);
  if (x >= 0 && x < W && y >= 0 && y < H) B[y * W + x] = c;
}
function disc(B, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
    if (x * x + y * y <= r * r + r * 0.6) px(B, cx + x, cy + y, c);
}
function line(B, x0, y0, x1, y1, c) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    px(B, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
/* Stepped sky bands with a 2-row ordered dither at each seam: no gradients. */
function sky(B, st, yEnd, x0, x1) {
  for (let k = 0; k < st.length; k += 2) {
    const ya = st[k], yb = k + 2 < st.length ? st[k + 2] : yEnd;
    rect(B, x0, ya, x1 - x0, yb - ya, st[k + 1]);
  }
  for (let k = 2; k < st.length; k += 2) {
    const yb = st[k], c = st[k + 1];
    for (let x = x0; x < x1; x++) {
      if (((x + yb) & 1) === 0) px(B, x, yb - 1, c);
      if (((x + 2 * yb) & 3) === 0) px(B, x, yb - 2, c);
    }
  }
}
function speckle(B, x, y, w, h, c, p, R) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (R() < p) px(B, i, j, c);
}
function palm(B, x0, baseY, h, lean, c) {
  let tx = x0, ty = baseY - h;
  for (let i = 0; i <= h; i++) {
    const t = i / h, x = x0 + Math.round(lean * t * t);
    rect(B, x, baseY - i, i < h * 0.7 ? 2 : 1, 1, c);
    if (i % 4 === 0 && i < h - 3) px(B, x - 1, baseY - i, c);
    tx = x; ty = baseY - i;
  }
  const A = [-2.95, -2.45, -1.95, -1.35, -0.85, -0.3, 0.2, 2.9];
  for (let k = 0; k < A.length; k++) {
    const a = A[k], L = 9 + (k % 3) * 2;
    for (let s = 0; s <= L; s++) {
      const fx = tx + Math.cos(a) * s, fy = ty + Math.sin(a) * s + 0.045 * s * s;
      px(B, fx, fy, c);
      if (s < L * 0.55) px(B, fx, fy + 1, c);
      if (s > 2 && (s & 1) === 0) px(B, fx, fy + 2, c);
    }
  }
  px(B, tx - 1, ty + 2, c); px(B, tx + 1, ty + 2, c);
}
function pine(B, x, baseY, h, c) {
  rect(B, x, baseY - 1, 1, 3, BROWN);
  for (let i = 0; i < h; i++) {
    const hw = Math.floor((h - i) * 0.3) + ((i & 3) === 0 ? 1 : 0);
    rect(B, x - hw, baseY - 1 - i, 2 * hw + 1, 1, c);
  }
  px(B, x, baseY - 1 - h, c);
}
function tri(B, ax, ay, lx, rx, by, c) {
  for (let y = ay; y <= by; y++) {
    const t = (y - ay) / (by - ay);
    const l = Math.round(ax + (lx - ax) * t), r = Math.round(ax + (rx - ax) * t);
    rect(B, l, y, r - l + 1, 1, c);
  }
}
function inArch(x, y, cx, top, r, bottom) {
  if (y < top || y > bottom) return false;
  const dx = x + 0.5 - cx;
  if (y >= top + r) return Math.abs(dx) <= r;
  const dy = y + 0.5 - (top + r);
  return dx * dx + dy * dy <= r * r;
}
function collect(list) { return Int32Array.from(list); }

/* ------------------------------ font ------------------------------ */
const GLYPH = new Uint16Array(128);
(() => {
  const G = {
    A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110',
    E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101',
    I:'111010010010111', J:'001001001101010', K:'101101110101101', L:'100100100100111',
    M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100',
    Q:'010101101110011', R:'110101110101101', S:'011100010001110', T:'111010010010010',
    U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101',
    Y:'101101010010010', Z:'111001010100111',
    '0':'111101101101111', '1':'010110010010111', '2':'110001010100111', '3':'110001010001110',
    '4':'101101111001001', '5':'111100110001110', '6':'011100111101111', '7':'111001010010010',
    '8':'111101111101111', '9':'111101111001110', ',':'000000000010100', '.':'000000000000010'
  };
  for (const k in G) GLYPH[k.charCodeAt(0)] = parseInt(G[k], 2);
})();
function glyph(B, code, x, y, c) {
  const g = GLYPH[code];
  if (!g) return;
  for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++)
    if (g & (1 << (14 - (r * 3 + k)))) px(B, x + k, y + r, c);
}
function text(B, s, x, y, c) {
  for (let i = 0; i < s.length; i++) glyph(B, s.charCodeAt(i), x + i * 4, y, c);
}
function numLen(n) { let d = 1; while (n >= 10) { n = (n / 10) | 0; d++; } return d; }
function num(B, n, x, y, c) {
  const d = numLen(n);
  for (let i = d - 1; i >= 0; i--) { glyph(B, 48 + (n % 10), x + i * 4, y, c); n = (n / 10) | 0; }
}
function box(B, x, y, w, fill, edge) {
  rect(B, x, y, w, 9, edge);
  rect(B, x + 1, y + 1, w - 2, 7, fill);
}

/* ------------------------------ gyms ------------------------------ */
/* Each gym: a static pre-rendered layer plus a stateless animated
   overlay driven by quantized scene time (no allocation per frame). */

function buildVenice() {
  const B = new Uint8Array(W * H), R = rng(11);
  sky(B, [0, DUSK, 10, PLUM, 20, RED, 30, CORAL, 40, AMBER], 49, 0, W);
  rect(B, 6, 13, 30, 1, PLUM); rect(B, 14, 14, 16, 1, PLUM);
  rect(B, 70, 24, 34, 1, CORAL); rect(B, 78, 25, 18, 1, CORAL);
  disc(B, 118, 49, 9, SUN);
  rect(B, 100, 43, 36, 1, AMBER); rect(B, 106, 46, 24, 1, AMBER);
  rect(B, 0, 49, W, 9, SEA); rect(B, 0, 49, W, 1, TEAL);
  for (let y = 50; y < 57; y++) {
    const w = 9 - (y - 50);
    if ((y & 1) === 0) rect(B, 118 - w, y, w * 2, 1, AMBER); else rect(B, 118 - (w >> 1), y, w, 1, SUN);
  }
  for (let x = 0; x < W; x++) if (((x >> 2) + x) % 3 !== 0) px(B, x, 57, STEEL_LT);
  rect(B, 0, 58, W, H - 58, SAND);
  for (let y = 58; y < 62; y++) for (let x = 0; x < W; x++) {
    if (y < 60 && ((x + y) & 1) === 0) B[y * W + x] = WOOD;
    else if (((x + 2 * y) & 3) === 0) B[y * W + x] = WOOD;
  }
  speckle(B, 0, 62, W, 28, WOOD, 0.05, R);
  // outdoor pull-up rig
  rect(B, 30, 36, 2, 38, STEEL_D); rect(B, 50, 36, 2, 38, STEEL_D); rect(B, 28, 36, 26, 2, STEEL_D);
  rect(B, 30, 38, 1, 36, STEEL); rect(B, 50, 38, 1, 36, STEEL);
  rect(B, 28, 74, 6, 1, STEEL_D); rect(B, 48, 74, 6, 1, STEEL_D);
  // parallel bars
  rect(B, 114, 63, 30, 1, STEEL_D); rect(B, 114, 67, 30, 1, STEEL_D);
  for (const x of [116, 140]) { rect(B, x, 63, 1, 11, STEEL_D); rect(B, x + 1, 67, 1, 7, STEEL_D); }
  palm(B, 12, 74, 52, 7, BROWN);
  palm(B, 151, 70, 40, -6, BROWN);
  return B;
}
const SWAY = new Int8Array([0, 1, 1, 0, -1, -1]);
function animVenice(B, t) {
  const f = Math.floor(t / QF);
  const sw = SWAY[(f >> 1) % 6];
  for (let k = 0; k < 2; k++) {
    const rx = 36 + k * 8;
    for (let y = 38; y < 48; y++) px(B, rx + (y > 43 ? sw : 0), y, STEEL_D);
    const ox = rx - 1 + sw, oy = 48;
    rect(B, ox + 1, oy, 2, 1, STEEL_D); rect(B, ox + 1, oy + 3, 2, 1, STEEL_D);
    rect(B, ox, oy + 1, 1, 2, STEEL_D); rect(B, ox + 3, oy + 1, 1, 2, STEEL_D);
  }
  const g = Math.floor(t / 250);
  for (let k = 0; k < 14; k++) {
    const x = hsh(k, g) % W, y = 50 + (hsh(k + 97, g) % 7), i = y * W + x;
    if (B[i] === SEA) { B[i] = TEAL; if (x + 1 < W && B[i + 1] === SEA) B[i + 1] = TEAL; }
  }
}

let nyStars, nyLit;
function buildManhattan() {
  const B = new Uint8Array(W * H), R = rng(22), stars = [], lit = [];
  rect(B, 0, 0, W, 63, STEEL_D);
  sky(B, [6, NIGHT, 30, NAVY, 46, DUSK], 58, 8, 152);
  for (let k = 0; k < 26; k++) {
    const x = 9 + Math.floor(R() * 142), y = 7 + Math.floor(R() * 20);
    B[y * W + x] = STEEL_LT; stars.push(y * W + x);
  }
  disc(B, 124, 15, 4, SUN); disc(B, 126, 14, 4, NIGHT);
  let x = 8;
  while (x < 152) {
    const bw = Math.min(5 + Math.floor(R() * 9), 152 - x);
    const tall = x > 58 && x < 104;
    const bh = 10 + Math.floor(R() * (tall ? 36 : 24));
    const top = 58 - bh;
    rect(B, x, top, bw, bh, NIGHT);
    rect(B, x, top, bw, 1, STEEL_D);
    if (R() < 0.3 && bw > 4) rect(B, x + (bw >> 1), top - 3 - Math.floor(R() * 5), 1, 8, NIGHT);
    for (let wy = top + 2; wy < 57; wy += 3) for (let wx = x + 1; wx < x + bw - 1; wx += 2) {
      if (R() < 0.33) { B[wy * W + wx] = R() < 0.7 ? AMBER : SUN; lit.push(wy * W + wx); }
    }
    x += bw + (R() < 0.3 ? 1 : 0);
  }
  // window frame: black steel, floor-to-ceiling
  rect(B, 6, 4, 148, 2, NIGHT); rect(B, 6, 58, 148, 2, NIGHT);
  for (const mx of [6, 54, 104, 152]) rect(B, mx, 4, 2, 56, NIGHT);
  rect(B, 8, 21, 144, 1, NIGHT);
  rect(B, 0, 62, W, 1, NIGHT);
  rect(B, 0, 63, W, H - 63, CHAR);
  for (let y = 64; y < 72; y++) for (let xx = 8; xx < 152; xx++) {
    if (xx >= 52 && xx < 58 || xx >= 102 && xx < 108) continue;
    if ((y < 67 && ((xx + y) & 1) === 0) || ((xx + 2 * y) & 3) === 0 && y < 70 || ((xx + y * 3) & 7) === 0) B[y * W + xx] = NAVY;
  }
  // bench
  rect(B, 14, 63, 30, 3, NIGHT); rect(B, 14, 63, 30, 1, STEEL);
  rect(B, 18, 66, 2, 8, STEEL); rect(B, 38, 66, 2, 8, STEEL);
  rect(B, 15, 73, 8, 1, STEEL); rect(B, 35, 73, 8, 1, STEEL);
  // cable tower
  rect(B, 126, 22, 3, 52, NIGHT); rect(B, 146, 22, 3, 52, NIGHT); rect(B, 126, 22, 23, 3, NIGHT);
  rect(B, 133, 26, 1, 30, STEEL_LT); rect(B, 141, 26, 1, 30, STEEL_LT);
  for (let y = 56; y < 74; y += 2) { rect(B, 131, y, 13, 1, STEEL); rect(B, 131, y + 1, 13, 1, STEEL_D); }
  disc(B, 137, 28, 2, STEEL);
  rect(B, 124, 74, 27, 1, NIGHT);
  nyStars = collect(stars); nyLit = collect(lit);
  return B;
}
function animManhattan(B, t) {
  const s = Math.floor(t / 333), w = Math.floor(t / 700);
  for (let i = 0; i < nyStars.length; i++) {
    const idx = nyStars[i]; if (B[idx] !== STEEL_LT) continue;
    const h = hsh(i, s) % 9; B[idx] = h === 0 ? NAVY : h === 1 ? W_LT : STEEL_LT;
  }
  for (let i = 0; i < nyLit.length; i++) if (hsh(i + 500, w) % 19 === 0) B[nyLit[i]] = NIGHT;
}

let atxBulbs;
function buildAustin() {
  const B = new Uint8Array(W * H), R = rng(33), bulbs = [];
  rect(B, 0, 0, W, 60, WOOD);
  for (let x = 3; x < W; x += 7) rect(B, x, 0, 1, 60, BRICK);
  speckle(B, 0, 0, W, 60, BRICK, 0.02, R);
  sky(B, [12, DUSK, 22, PLUM, 33, CORAL, 43, AMBER], 52, 36, 124);
  disc(B, 98, 52, 5, SUN);
  rect(B, 36, 52, 88, 8, BROWN);
  for (let x = 38; x < 124; x += 6) rect(B, x, 48, 1, 4, BROWN);
  rect(B, 36, 49, 88, 1, BROWN);
  line(B, 60, 30, 56, 51, BROWN); line(B, 60, 30, 64, 51, BROWN); rect(B, 57, 42, 7, 1, BROWN);
  line(B, 60, 29, 60, 23, BROWN); line(B, 60, 29, 66, 29, BROWN); line(B, 60, 29, 54, 29, BROWN); line(B, 60, 29, 64, 33, BROWN);
  rect(B, 61, 28, 4, 1, BROWN);
  // door frame + rolled-up door
  rect(B, 34, 8, 92, 2, BROWN); rect(B, 34, 10, 2, 50, BROWN); rect(B, 124, 10, 2, 50, BROWN);
  rect(B, 36, 10, 88, 6, STEEL); rect(B, 36, 11, 88, 1, STEEL_D); rect(B, 36, 13, 88, 1, STEEL_D); rect(B, 36, 15, 88, 1, STEEL_D);
  // string lights
  for (let x = 0; x < W; x++) {
    const d = (x - 80) / 80, y = Math.round(2 + 7 * (1 - d * d));
    px(B, x, y, BROWN);
    if (x % 9 === 4) { B[(y + 1) * W + x] = (x / 9) & 1 ? AMBER : SUN; bulbs.push((y + 1) * W + x); }
  }
  // floor: concrete + rubber mats
  rect(B, 0, 60, W, 30, STEEL_D);
  rect(B, 0, 69, W, 21, CHAR);
  for (let x = 12; x < W; x += 24) rect(B, x, 69, 1, 21, STEEL_D);
  rect(B, 0, 80, W, 1, STEEL_D);
  // power rack
  rect(B, 6, 14, 2, 60, NIGHT); rect(B, 26, 14, 2, 60, NIGHT); rect(B, 6, 14, 22, 2, NIGHT);
  for (let y = 18; y < 72; y += 3) { px(B, 7, y, STEEL); px(B, 27, y, STEEL); }
  rect(B, 0, 36, 34, 1, STEEL_LT);
  rect(B, 1, 31, 3, 11, RED); rect(B, 29, 31, 3, 11, RED); px(B, 2, 36, NIGHT); px(B, 30, 36, NIGHT);
  rect(B, 4, 73, 28, 1, NIGHT);
  // tractor tire
  rect(B, 128, 66, 28, 8, NIGHT); rect(B, 127, 67, 1, 6, NIGHT); rect(B, 156, 67, 1, 6, NIGHT);
  rect(B, 129, 66, 26, 1, STEEL_D);
  for (let x = 130; x < 155; x += 3) rect(B, x, 68, 1, 5, CHAR);
  atxBulbs = collect(bulbs);
  return B;
}
function animAustin(B, t) {
  const f = Math.floor(t / 250);
  for (let i = 0; i < atxBulbs.length; i++) {
    const h = hsh(i, f) % 7;
    B[atxBulbs[i]] = h === 0 ? CORAL : h < 3 ? SUN : AMBER;
  }
}

function buildChicago() {
  const B = new Uint8Array(W * H), R = rng(44);
  for (let y = 0; y < 61; y++) {
    const row = (y / 5) | 0;
    for (let x = 0; x < W; x++) {
      if (y % 5 === 4) { B[y * W + x] = BROWN; continue; }
      const off = (row & 1) * 5;
      if ((x + off) % 10 === 9) { B[y * W + x] = BROWN; continue; }
      const id = row * 64 + (((x + off) / 10) | 0), h = hsh(id, 7) % 12;
      B[y * W + x] = h === 0 ? RED : h === 1 ? BROWN : BRICK;
    }
  }
  for (const cx of [35, 125]) {
    for (let y = 4; y < 48; y++) for (let x = cx - 22; x < cx + 22; x++)
      if (inArch(x, y, cx, 6, 19, 47)) B[y * W + x] = STEEL_D;
    for (let y = 4; y < 48; y++) for (let x = cx - 22; x < cx + 22; x++)
      if (inArch(x, y, cx, 8, 17, 45)) B[y * W + x] = NAVY;
    for (let x = cx - 16; x < cx + 17; x++) {
      const hb = 3 + hsh(x, 3) % 8;
      for (let y = 45 - hb; y <= 45; y++) if (inArch(x, y, cx, 8, 17, 45)) B[y * W + x] = NIGHT;
      if (hsh(x, 9) % 5 === 0) px(B, x, 45 - (hb >> 1), AMBER);
    }
    for (let y = 8; y < 46; y++) for (let x = cx - 17; x < cx + 18; x++) {
      if (!inArch(x, y, cx, 8, 17, 45)) continue;
      if ((x - cx + 17) % 9 === 8 || (y - 8) % 8 === 7) B[y * W + x] = STEEL_D;
    }
    rect(B, cx - 21, 47, 42, 2, STEEL);
  }
  // pendant lamp over the lifting spot
  rect(B, 80, 0, 1, 12, NIGHT);
  rect(B, 78, 12, 5, 1, NIGHT); rect(B, 77, 13, 7, 1, NIGHT); rect(B, 76, 14, 9, 1, NIGHT);
  rect(B, 79, 15, 3, 1, SUN);
  // wood plank floor
  rect(B, 0, 61, W, 1, BROWN);
  rect(B, 0, 62, W, H - 62, WOOD);
  for (const y of [66, 71, 77, 84]) rect(B, 0, y, W, 1, BRICK);
  for (let y = 62; y < H; y++) for (let x = 0; x < W; x++) if ((x + ((y / 5) | 0) * 23) % 37 === 0) B[y * W + x] = BRICK;
  for (let y = 64; y < 84; y++) for (let x = 56; x < 105; x++) {
    const dx = (x - 80) / 26, dy = (y - 74) / 9;
    if (dx * dx + dy * dy < 1 && ((x + 2 * y) & 3) === 0) B[y * W + x] = SAND;
  }
  // kettlebells + plate stack
  const kb = (x, r) => {
    disc(B, x, 74 - r, r, NIGHT);
    rect(B, x - r + 1, 74 - 2 * r - 3, 2 * r - 1, 1, NIGHT);
    rect(B, x - r + 1, 74 - 2 * r - 3, 1, 3, NIGHT); rect(B, x + r - 1, 74 - 2 * r - 3, 1, 3, NIGHT);
    px(B, x - 1, 74 - r - 1, STEEL_D);
  };
  kb(14, 3); kb(24, 4); kb(36, 5);
  for (let k = 0; k < 4; k++) { rect(B, 128 - k, 72 - k * 2, 24 + k * 2, 2, k & 1 ? STEEL_D : NIGHT); }
  rect(B, 138, 64, 4, 2, STEEL);
  return B;
}
function animChicago(B, t) {
  if (hsh(Math.floor(t / QF), 5) % 29 === 0) rect(B, 79, 15, 3, 1, AMBER);
}

let miaStars;
function buildMiami() {
  const B = new Uint8Array(W * H), R = rng(55), stars = [];
  sky(B, [0, NIGHT, 20, NAVY, 34, PLUM], 44, 0, W);
  for (let k = 0; k < 24; k++) {
    const x = Math.floor(R() * W), y = 1 + Math.floor(R() * 18);
    B[y * W + x] = STEEL_LT; stars.push(y * W + x);
  }
  disc(B, 40, 16, 6, SUN); px(B, 38, 14, AMBER); px(B, 42, 18, AMBER); px(B, 43, 15, AMBER);
  rect(B, 0, 44, W, 10, SEA); rect(B, 0, 44, W, 1, DUSK);
  // deco towers on the shoreline
  let x = 104;
  while (x < W) {
    const bw = 7 + (hsh(x, 1) % 8), bh = 8 + (hsh(x, 2) % 16), top = 44 - bh;
    rect(B, x, top, bw, bh, NIGHT);
    rect(B, x + 1, top - 1, bw - 2, 1, NIGHT);
    for (let wy = top + 2; wy < 43; wy += 3) for (let wx = x + 1; wx < x + bw - 1; wx += 2)
      if (hsh(wx, wy) % 3 === 0) B[wy * W + wx] = hsh(wx + wy, 4) & 1 ? TEAL : CORAL;
    x += bw + 1;
  }
  palm(B, 8, 54, 40, 5, NIGHT);
  // parapet with deco stripes
  rect(B, 0, 54, W, 10, STEEL);
  rect(B, 0, 54, W, 1, STEEL_LT);
  rect(B, 0, 57, W, 1, TEAL); rect(B, 0, 59, W, 1, CORAL);
  for (let xx = 4; xx < W; xx += 12) rect(B, xx, 61, 6, 2, STEEL_D);
  // deck + pool
  rect(B, 0, 64, W, H - 64, STEEL_D);
  for (let xx = 0; xx < W; xx += 8) rect(B, xx, 64, 1, H - 64, CHAR);
  for (let y = 70; y < H; y += 8) rect(B, 0, y, W, 1, CHAR);
  rect(B, 104, 65, 56, 1, STEEL_LT);
  rect(B, 106, 66, 54, 9, TEAL);
  rect(B, 106, 66, 54, 1, SEA);
  // lounger
  rect(B, 12, 67, 24, 2, CORAL); line(B, 36, 67, 42, 61, CORAL); line(B, 37, 67, 43, 61, CORAL);
  rect(B, 14, 69, 1, 5, NIGHT); rect(B, 33, 69, 1, 5, NIGHT);
  miaStars = collect(stars);
  return B;
}
function animMiami(B, t) {
  const s = Math.floor(t / 333), f = Math.floor(t / 250);
  for (let i = 0; i < miaStars.length; i++) {
    const idx = miaStars[i], h = hsh(i, s) % 8;
    B[idx] = h === 0 ? NAVY : h === 1 ? W_LT : STEEL_LT;
    if (idx >= 20 * W && h === 0) B[idx] = NAVY;
  }
  for (let y = 46; y < 54; y += 2) {
    const w = 6 - ((y - 46) >> 1) + (hsh(y, f) % 3);
    const o = (hsh(y + 3, f) % 3) - 1;
    rect(B, 40 - w + o, y, w * 2, 1, (hsh(y, f) & 1) ? SUN : AMBER);
  }
  for (let k = 0; k < 7; k++) {
    const x = 108 + hsh(k, f) % 48, y = 68 + hsh(k + 31, f) % 6;
    rect(B, x, y, 3, 1, SKY_LT);
  }
}

function buildBoulder() {
  const B = new Uint8Array(W * H), R = rng(66);
  sky(B, [0, DUSK, 11, SKY, 22, SKY_LT, 34, SUN], 58, 0, W);
  disc(B, 112, 44, 7, W_LT);
  // far range
  for (let x = 0; x < W; x++) {
    const y = Math.round(42 - 4 * Math.sin(x * 0.06 + 1) - 3 * Math.sin(x * 0.17) - 2 * Math.sin(x * 0.41 + 2));
    rect(B, x, y, 1, 58 - y, PLUM);
    if (y < 36) px(B, x, y, W_SH);
  }
  // flatiron slabs
  const slab = (ax, ay, lx, rx) => {
    tri(B, ax, ay, lx, rx, 58, BRICK);
    line(B, ax, ay, lx, 58, CORAL);
    line(B, ax + 1, ay + 1, rx, 58, BROWN);
  };
  slab(26, 30, 12, 44); slab(46, 34, 34, 62); slab(64, 40, 54, 78);
  // meadow
  rect(B, 0, 58, W, H - 58, GRASS);
  for (let x = 0; x < W; x++) { if ((x & 1) === 0) px(B, x, 58, PINE); if ((x & 3) === 0) px(B, x, 59, PINE); }
  speckle(B, 0, 60, W, 30, PINE, 0.07, R);
  speckle(B, 0, 64, W, 26, AMBER, 0.006, R);
  speckle(B, 0, 64, W, 26, CORAL, 0.005, R);
  // trail
  for (let y = 58; y < H; y++) {
    const t = (y - 58) / (H - 58), c = 80 + Math.round(Math.sin(t * 3.2) * 14 * (1 - t));
    const hw = 1 + Math.round(t * 14);
    rect(B, c - hw, y, hw * 2 + 1, 1, SAND);
    if (hw > 3) { px(B, c - hw, y, WOOD); px(B, c + hw, y, WOOD); }
  }
  // pines
  pine(B, 128, 62, 14, PINE); pine(B, 116, 60, 9, PINE);
  pine(B, 8, 75, 32, PINE); pine(B, 20, 72, 22, PINE);
  pine(B, 146, 76, 34, PINE); pine(B, 157, 73, 24, PINE);
  // trail marker post
  rect(B, 102, 66, 2, 8, BROWN); rect(B, 100, 64, 6, 3, WOOD);
  return B;
}
function animBoulder(B, t) {
  for (let k = 0; k < 3; k++) {
    const x = Math.floor(((t / 90) + k * 23) % 200) - 20, y = 14 + k * 5 + (hsh(k, Math.floor(t / 333)) & 1);
    const up = (Math.floor(t / 250) + k) & 1;
    px(B, x, y, DUSK); px(B, x - 1, y - up, DUSK); px(B, x + 1, y - up, DUSK);
  }
}

function twinkle(B, list, t, seed) {
  const s = Math.floor(t / 333);
  for (let i = 0; i < list.length; i++) {
    const idx = list[i], h = hsh(i + seed, s) % 9;
    B[idx] = h === 0 ? NAVY : h === 1 ? W_LT : STEEL_LT;
  }
}
function mesa(B, x0, x1, top, base, c) {
  for (let y = top; y <= base; y++) { const sl = (y - top) >> 1; rect(B, x0 - sl, y, x1 - x0 + 2 * sl, 1, c); }
}
function saguaro(B, x, base, h) {
  rect(B, x, base - h, 3, h, GRASS); rect(B, x + 2, base - h + 1, 1, h - 1, PINE); px(B, x, base - h, SAND);
  const ay = base - Math.round(h * 0.55);
  rect(B, x - 4, ay, 4, 2, GRASS); rect(B, x - 4, ay - 7, 2, 7, GRASS); px(B, x - 4, ay - 7, SAND);
  const by = base - Math.round(h * 0.7);
  rect(B, x + 3, by, 4, 2, GRASS); rect(B, x + 5, by - 6, 2, 6, GRASS); rect(B, x + 6, by - 5, 1, 7, PINE);
}
function cloud(B, x, y) {
  disc(B, x, y, 3, W_LT); disc(B, x + 5, y - 2, 4, W_LT); disc(B, x + 11, y, 3, W_LT);
  rect(B, x - 3, y + 1, 18, 3, W_LT); rect(B, x - 2, y + 3, 16, 1, W_SH);
}
function kettlebell(B, x, r) {
  disc(B, x, 74 - r, r, NIGHT);
  rect(B, x - r + 1, 74 - 2 * r - 3, 2 * r - 1, 1, NIGHT);
  rect(B, x - r + 1, 74 - 2 * r - 3, 1, 3, NIGHT); rect(B, x + r - 1, 74 - 2 * r - 3, 1, 3, NIGHT);
  px(B, x - 1, 74 - r - 1, STEEL_D);
}

/* FEB · Anchorage: snowfield, log cabin, northern lights */
let akStars;
function buildAnchorage() {
  const B = new Uint8Array(W * H), R = rng(77), stars = [];
  sky(B, [0, NIGHT, 28, NAVY, 46, DUSK], 56, 0, W);
  for (let k = 0; k < 30; k++) { const x = Math.floor(R() * W), y = 1 + Math.floor(R() * 30); B[y * W + x] = STEEL_LT; stars.push(y * W + x); }
  for (let x = 0; x < W; x++) {
    const y = Math.round(44 - 6 * Math.sin(x * 0.045 + 0.5) - 4 * Math.sin(x * 0.13 + 2) - 2 * Math.sin(x * 0.37));
    rect(B, x, y, 1, 56 - y, CHAR);
    if (y < 42) rect(B, x, y, 1, 2 + ((x * 7) % 3), STEEL_LT);
  }
  rect(B, 0, 56, W, H - 56, STEEL_LT);
  for (let x = 0; x < W; x++) { if ((x & 1) === 0) px(B, x, 56, STEEL); if ((x & 3) === 1) px(B, x, 57, STEEL); }
  speckle(B, 0, 58, W, 32, W_SH, 0.08, R);
  pine(B, 108, 58, 10, PINE); pine(B, 132, 58, 13, PINE); pine(B, 146, 64, 22, PINE); pine(B, 156, 70, 28, PINE);
  // log cabin gym
  rect(B, 6, 46, 40, 28, BROWN);
  for (let y = 47; y < 74; y += 3) { rect(B, 6, y, 40, 1, BRICK); px(B, 5, y, WOOD); px(B, 46, y, WOOD); }
  rect(B, 38, 32, 4, 10, BRICK);
  tri(B, 26, 32, 1, 51, 46, CHAR);
  line(B, 26, 32, 1, 46, STEEL_LT); line(B, 26, 32, 51, 46, STEEL_LT);
  line(B, 26, 33, 2, 46, STEEL_LT); line(B, 26, 33, 50, 46, STEEL_LT); line(B, 26, 31, 0, 46, W_SH);
  rect(B, 12, 54, 12, 9, AMBER); rect(B, 17, 54, 1, 9, BROWN); rect(B, 12, 58, 12, 1, BROWN); px(B, 14, 56, SUN); px(B, 20, 60, SUN);
  rect(B, 30, 57, 9, 17, NIGHT); px(B, 37, 65, AMBER);
  // tire for flips
  rect(B, 122, 66, 28, 8, NIGHT); rect(B, 121, 67, 1, 6, NIGHT); rect(B, 150, 67, 1, 6, NIGHT);
  rect(B, 123, 66, 26, 1, STEEL_D); rect(B, 124, 65, 22, 1, W_SH);
  for (let x = 124; x < 149; x += 3) rect(B, x, 68, 1, 5, CHAR);
  akStars = collect(stars);
  return B;
}
function animAnchorage(B, t) {
  twinkle(B, akStars, t, 300);
  const ph = t / 1400;
  for (let x = 0; x < W; x++) {
    if (Math.sin(x * 0.07 + ph * 0.8) < -0.35) continue;
    const c = Math.round(15 + 5 * Math.sin(x * 0.045 + ph) + 2 * Math.sin(x * 0.13 - ph * 1.3));
    const len = 7 + (hsh(x >> 1, Math.floor(t / 333)) % 5);
    for (let k = -1; k < len; k++) {
      const y = c + k, idx = y * W + x;
      if (y < 0 || (B[idx] !== NIGHT && B[idx] !== NAVY && B[idx] !== STEEL_LT && B[idx] !== W_LT)) continue;
      if (k === -1) { if ((x + y) & 1) B[idx] = TEAL; }
      else if (k < 2) B[idx] = MINT;
      else if (k < len - 3) B[idx] = TEAL;
      else if (((x + y) & 1) === 0) B[idx] = SEA;
    }
  }
}

/* MAR · New Orleans: courtyard under an iron balcony, beads and gas lamps */
let nolaLamps;
function buildNola() {
  const B = new Uint8Array(W * H), lamps = [];
  sky(B, [0, DUSK, 9, PLUM, 17, CORAL], 20, 0, W);
  rect(B, 0, 18, W, 44, TEAL); rect(B, 0, 18, W, 2, STEEL_LT); rect(B, 0, 20, W, 1, SEA);
  for (let i = 0; i < 6; i++) {
    const x = 9 + i * 26;
    rect(B, x, 23, 10, 12, i & 1 ? AMBER : NAVY); rect(B, x + 4, 23, 1, 12, NIGHT); rect(B, x, 28, 10, 1, NIGHT);
    for (const sx of [x - 3, x + 10]) { rect(B, sx, 22, 3, 14, GRASS); for (let y = 23; y < 36; y += 2) rect(B, sx, y, 3, 1, PINE); }
    rect(B, x, 45, 10, 17, NIGHT); rect(B, x + 1, 44, 8, 1, NIGHT);
    for (const sx of [x - 3, x + 10]) { rect(B, sx, 45, 3, 17, GRASS); for (let y = 46; y < 62; y += 2) rect(B, sx, y, 3, 1, PINE); }
    if (i < 5) { const lx = x + 17; rect(B, lx, 46, 3, 4, NIGHT); px(B, lx + 1, 47, AMBER); px(B, lx + 1, 48, AMBER); rect(B, lx + 1, 50, 1, 2, NIGHT); lamps.push(47 * W + lx + 1, 48 * W + lx + 1); }
  }
  // iron balcony
  rect(B, 0, 36, W, 1, NIGHT); rect(B, 0, 41, W, 1, NIGHT); rect(B, 0, 42, W, 2, NIGHT);
  for (let x = 0; x < W; x += 3) rect(B, x, 37, 1, 4, NIGHT);
  for (let x = 1; x < W; x += 6) { px(B, x, 38, NIGHT); px(B, x + 1, 39, NIGHT); }
  for (let x = 12; x < W; x += 26) { rect(B, x, 44, 2, 1, NIGHT); px(B, x, 45, NIGHT); }
  const BEAD = [PLUM, GRASS, AMBER];
  for (let x = 0; x < W; x++) { const d = ((x % 13) - 6) / 6; px(B, x, 37 + Math.round(2.4 * (1 - d * d)), BEAD[x % 3]); }
  // brick courtyard
  rect(B, 0, 62, W, H - 62, BRICK);
  for (let y = 62; y < H; y++) {
    if ((y - 62) % 3 === 2) { rect(B, 0, y, W, 1, BROWN); continue; }
    const off = (((y - 62) / 3) | 0) & 1 ? 3 : 0;
    for (let x = off; x < W; x += 6) px(B, x, y, BROWN);
  }
  rect(B, 0, 62, W, 1, BROWN);
  // plyo boxes
  rect(B, 12, 62, 22, 12, WOOD); rect(B, 12, 62, 22, 1, SAND); rect(B, 12, 62, 1, 12, BRICK); rect(B, 33, 62, 1, 12, BRICK);
  rect(B, 16, 54, 15, 8, WOOD); rect(B, 16, 54, 15, 1, SAND); rect(B, 16, 54, 1, 8, BRICK); rect(B, 30, 54, 1, 8, BRICK);
  // potted fern + kettlebell
  rect(B, 132, 66, 10, 8, CORAL); rect(B, 132, 66, 10, 1, SUN);
  line(B, 137, 66, 130, 58, GRASS); line(B, 137, 66, 144, 58, GRASS); line(B, 137, 66, 137, 55, GRASS);
  line(B, 137, 66, 132, 60, PINE); line(B, 137, 66, 142, 60, PINE);
  kettlebell(B, 152, 4);
  nolaLamps = collect(lamps);
  return B;
}
function animNola(B, t) {
  const f = Math.floor(t / QF);
  for (let i = 0; i < nolaLamps.length; i++) B[nolaLamps[i]] = hsh(i, f) % 4 === 0 ? SUN : AMBER;
}

/* APR · Seattle: rain on the window, evergreens, a bouldering wall */
function buildSeattle() {
  const B = new Uint8Array(W * H), R = rng(88);
  rect(B, 0, 0, W, 64, STEEL);
  for (let y = 4; y < 64; y += 10) for (let x = 4; x < W; x += 12) px(B, x, y, STEEL_D);
  sky(B, [6, STEEL_LT, 26, W_SH], 56, 8, 106);
  tri(B, 66, 24, 44, 92, 44, W_SH); tri(B, 66, 24, 60, 72, 30, W_LT);
  for (let x = 8; x < 106; x++) {
    const h = 8 + ((x % 5) === 2 ? 4 : 0) + (hsh(x, 1) % 3);
    rect(B, x, 52 - h, 1, h + 4, STEEL_D);
  }
  for (let x = 10; x < 106; x += 7) pine(B, x + (hsh(x, 2) % 3), 57, 10 + (hsh(x, 3) % 8), PINE);
  rect(B, 6, 4, 102, 2, NIGHT); rect(B, 6, 56, 102, 2, NIGHT);
  for (const mx of [6, 40, 73, 106]) rect(B, mx, 4, 2, 54, NIGHT);
  rect(B, 8, 30, 98, 1, NIGHT);
  // bouldering wall
  rect(B, 114, 4, 46, 70, CHAR);
  for (let x = 114; x < W; x += 12) rect(B, x, 4, 1, 70, STEEL_D);
  for (let y = 4; y < 74; y += 14) rect(B, 114, y, 46, 1, STEEL_D);
  const HOLD = [CORAL, AMBER, TEAL, GRASS, PLUM, SKY];
  for (let k = 0; k < 42; k++) {
    const x = 116 + Math.floor(R() * 42), y = 6 + Math.floor(R() * 56), c = HOLD[k % HOLD.length];
    rect(B, x, y, 2 + (k % 2), 2, c); px(B, x, y + 2, NIGHT);
  }
  // floor, crash pad, rower
  rect(B, 0, 64, W, H - 64, STEEL_D); rect(B, 0, 64, W, 1, NIGHT);
  rect(B, 112, 66, 48, 8, SKY); rect(B, 112, 66, 48, 1, SKY_LT);
  for (let x = 124; x < W; x += 12) rect(B, x, 67, 1, 7, DUSK);
  rect(B, 10, 71, 36, 2, NIGHT); disc(B, 14, 67, 5, NIGHT); px(B, 14, 67, STEEL);
  line(B, 18, 64, 23, 59, NIGHT); rect(B, 22, 56, 5, 3, NIGHT); rect(B, 23, 57, 3, 1, TEAL);
  rect(B, 32, 68, 7, 2, STEEL); rect(B, 21, 69, 4, 2, STEEL_LT);
  rect(B, 9, 73, 4, 1, NIGHT); rect(B, 42, 73, 4, 1, NIGHT);
  return B;
}
function animSeattle() {}

/* AUG · Phoenix: desert dusk, mesas, saguaros, a shade ramada */
function buildPhoenix() {
  const B = new Uint8Array(W * H), R = rng(99);
  sky(B, [0, SKY, 12, SKY_LT, 24, SUN, 34, AMBER, 42, CORAL], 52, 0, W);
  disc(B, 34, 50, 8, SUN);
  mesa(B, 0, 36, 42, 52, PLUM); mesa(B, 104, 160, 38, 52, PLUM);
  mesa(B, 62, 98, 33, 56, RED);
  for (let y = 37; y < 56; y += 4) for (let x = 40; x < 120; x++) if (B[y * W + x] === RED) B[y * W + x] = BRICK;
  for (let y = 33; y < 56; y++) { const sl = (y - 33) >> 1; px(B, 62 - sl, y, CORAL); }
  rect(B, 0, 52, W, H - 52, SAND);
  for (let x = 0; x < W; x++) { if ((x & 1) === 0) px(B, x, 52, WOOD); if ((x & 3) === 2) px(B, x, 53, WOOD); }
  speckle(B, 0, 54, W, 36, WOOD, 0.05, R); speckle(B, 0, 58, W, 32, BRICK, 0.01, R);
  saguaro(B, 8, 72, 32); saguaro(B, 136, 70, 26); saguaro(B, 112, 57, 12); saguaro(B, 152, 74, 18);
  // ramada with a heavy bag
  rect(B, 22, 34, 2, 40, WOOD); rect(B, 50, 34, 2, 40, WOOD); rect(B, 23, 34, 1, 40, BRICK);
  rect(B, 18, 32, 38, 2, BROWN); for (let x = 18; x < 56; x += 3) rect(B, x, 30, 2, 2, BROWN);
  rect(B, 36, 34, 1, 4, STEEL_D);
  rect(B, 33, 38, 7, 18, RED); rect(B, 34, 37, 5, 1, RED); rect(B, 34, 56, 5, 1, RED);
  rect(B, 33, 40, 7, 1, NIGHT); rect(B, 33, 53, 7, 1, NIGHT); rect(B, 34, 41, 1, 12, CORAL);
  for (let x = 16; x < 58; x++) if (((x + 75) & 1) === 0) px(B, x, 75, WOOD);
  return B;
}
function animPhoenix(B, t) {
  for (let k = 0; k < 2; k++) {
    const a = t / 1600 + k * 3.1;
    const x = Math.round(118 + Math.cos(a) * 18), y = Math.round(14 + Math.sin(a) * 5);
    const up = (Math.floor(t / 250) + k) & 1;
    px(B, x, y, BROWN); px(B, x - 1, y - up, BROWN); px(B, x + 1, y - up, BROWN); px(B, x - 2, y - up, BROWN); px(B, x + 2, y - up, BROWN);
  }
}

/* OCT · Vermont: fall foliage, a red barn gym, hay bales */
function buildVermont() {
  const B = new Uint8Array(W * H), R = rng(111);
  sky(B, [0, SKY, 18, SKY_LT], 46, 0, W);
  cloud(B, 22, 12); cloud(B, 98, 17);
  for (let x = 0; x < W; x++) { const y = Math.round(36 - 4 * Math.sin(x * 0.04 + 1) - 2 * Math.sin(x * 0.11)); rect(B, x, y, 1, 46 - y, SEA); }
  const LEAF = [CORAL, AMBER, RED, BRICK, SUN, CORAL, AMBER, GRASS];
  for (let x = 0; x < W; x++) {
    const top = Math.round(43 - 3 * Math.abs(Math.sin(x * 0.33)) - 2 * Math.abs(Math.sin(x * 0.09 + 1)));
    for (let y = top; y < 58; y++) {
      const c = LEAF[hsh(((x + (y & 4)) >> 2) * 131 + (y >> 2), 5) % LEAF.length];
      B[y * W + x] = (hsh(x, y) % 7 === 0) ? LEAF[hsh(y, x) % LEAF.length] : c;
    }
  }
  rect(B, 0, 58, W, H - 58, GRASS);
  for (let x = 0; x < W; x++) { if ((x & 1) === 0) px(B, x, 58, PINE); }
  speckle(B, 0, 59, W, 31, PINE, 0.06, R); speckle(B, 0, 60, W, 30, CORAL, 0.02, R); speckle(B, 0, 60, W, 30, AMBER, 0.02, R);
  // red barn
  for (let y = 22; y < 37; y++) {
    const hw = y < 28 ? Math.round(8 + (y - 22) * 2.3) : Math.round(22 + (y - 28) * 0.75);
    rect(B, 124 - hw, y, hw * 2, 1, CHAR); px(B, 124 - hw, y, STEEL_D); px(B, 123 + hw, y, STEEL_D);
  }
  rect(B, 98, 37, 52, 37, RED);
  for (let x = 100; x < 150; x += 3) rect(B, x, 37, 1, 37, BRICK);
  rect(B, 96, 36, 56, 1, STEEL_LT);
  rect(B, 119, 40, 10, 7, NIGHT); rect(B, 118, 39, 12, 1, STEEL_LT); rect(B, 118, 47, 12, 1, STEEL_LT);
  rect(B, 114, 51, 20, 23, NIGHT); rect(B, 113, 50, 22, 1, STEEL_LT); rect(B, 113, 50, 1, 24, STEEL_LT); rect(B, 134, 50, 1, 24, STEEL_LT);
  for (const dx of [102, 136]) { rect(B, dx, 51, 10, 23, RED); rect(B, dx, 51, 10, 1, STEEL_LT); rect(B, dx, 73, 10, 1, STEEL_LT); rect(B, dx, 51, 1, 23, STEEL_LT); rect(B, dx + 9, 51, 1, 23, STEEL_LT); line(B, dx, 51, dx + 9, 73, STEEL_LT); line(B, dx + 9, 51, dx, 73, STEEL_LT); }
  rect(B, 118, 55, 1, 19, STEEL_D); rect(B, 129, 55, 1, 19, STEEL_D); rect(B, 116, 61, 16, 1, STEEL); rect(B, 116, 58, 2, 7, STEEL_LT); rect(B, 130, 58, 2, 7, STEEL_LT);
  // hay bales + sledgehammer
  rect(B, 10, 64, 24, 10, SAND); rect(B, 10, 64, 24, 1, SUN); for (let x = 12; x < 34; x += 4) rect(B, x, 65, 1, 9, WOOD); rect(B, 17, 64, 1, 10, BROWN); rect(B, 27, 64, 1, 10, BROWN);
  rect(B, 14, 56, 16, 8, SAND); rect(B, 14, 56, 16, 1, SUN); for (let x = 16; x < 30; x += 4) rect(B, x, 57, 1, 7, WOOD); rect(B, 21, 56, 1, 8, BROWN);
  line(B, 42, 74, 48, 60, BROWN); rect(B, 45, 57, 6, 3, NIGHT);
  return B;
}
function animVermont() {}

/* NOV · San Francisco: fog over a red suspension bridge, hill stairs */
function buildSanFrancisco() {
  const B = new Uint8Array(W * H), R = rng(122);
  sky(B, [0, STEEL_LT, 24, W_SH], 48, 0, W);
  for (let x = 0; x < W; x++) { const y = Math.round(42 - 3 * Math.sin(x * 0.05) - 2 * Math.sin(x * 0.15 + 1)); rect(B, x, y, 1, 48 - y, STEEL); }
  rect(B, 0, 48, W, 10, STEEL_D); for (let x = 0; x < W; x++) if (((x + 2 * 49) & 3) === 0) px(B, x, 49, STEEL);
  // bridge: cables, suspenders, towers, deck
  const cab = (x) => {
    if (x >= 34 && x <= 118) { const d = (x - 76) / 42; return 12 + 27 * (1 - d * d); }
    if (x < 34) { const d = (34 - x) / 50; return 12 + 30 * d * d * 1.6; }
    const d = (x - 118) / 50; return 12 + 30 * d * d * 1.6;
  };
  for (let x = 0; x < W; x++) {
    const y = Math.round(cab(x));
    if (y < 42) { px(B, x, y, RED); if (x % 3 === 0) for (let yy = y + 1; yy < 42; yy++) px(B, x, yy, BRICK); }
  }
  rect(B, 0, 42, W, 2, RED); rect(B, 0, 44, W, 1, BRICK);
  for (const tx of [34, 118]) {
    rect(B, tx - 3, 10, 2, 38, RED); rect(B, tx + 1, 10, 2, 38, RED); rect(B, tx - 3, 10, 1, 38, CORAL);
    for (const by of [11, 20, 30, 38]) rect(B, tx - 3, by, 6, 1, RED);
  }
  // hilltop park
  rect(B, 0, 58, W, H - 58, GRASS);
  for (let x = 0; x < W; x++) { const y = 58 - Math.round(2 * Math.sin(x * 0.04 + 0.6)); rect(B, x, y, 1, 60 - y, GRASS); px(B, x, y, PINE); }
  speckle(B, 0, 60, W, 30, PINE, 0.06, R);
  // windswept cypress
  line(B, 14, 74, 17, 54, BROWN); line(B, 15, 74, 18, 54, BROWN); line(B, 17, 54, 24, 46, BROWN);
  rect(B, 2, 44, 32, 4, PINE); rect(B, 6, 41, 24, 3, PINE); rect(B, 14, 39, 16, 2, PINE); rect(B, 0, 48, 12, 2, PINE);
  for (let x = 2; x < 34; x += 2) { px(B, x, 43, GRASS); px(B, x + 1, 48, PINE); }
  // city stairs
  for (let k = 0; k < 11; k++) { const x = 118 + k * 4, y = 72 - k * 2; rect(B, x, y, W - x, 74 - y, STEEL); rect(B, x, y, W - x, 1, W_SH); }
  rect(B, 116, 74, 44, 1, STEEL_D);
  line(B, 120, 64, 160, 44, NIGHT); for (let x = 122; x < W; x += 10) { const y = 64 - Math.round((x - 120) / 2); rect(B, x, y, 1, 72 - (x - 118) / 2 - y, NIGHT); }
  return B;
}
function animSanFrancisco(B, t) {
  const off = Math.floor(t / 120);
  for (let y = 30; y < 50; y++) {
    const dens = 1 - Math.abs(y - 40) / 10;
    for (let x = 0; x < W; x++) {
      const n = 0.5 + 0.5 * Math.sin((x + off) * 0.06) * Math.sin((x - off * 0.5) * 0.023 + y * 0.1);
      const th = Math.floor(dens * n * 16);
      const i = y * W + x, b = B[i];
      if (b === PINE || b === BROWN || b === GRASS) continue;
      if (BAYER[((x + off) & 3) | ((y & 3) << 2)] < th) B[i] = y < 40 ? W_SH : STEEL_LT;
    }
  }
}

/* weather: wk 3 snow, 4 rain, 5 leaves; wr spawn rate per tick; wm mask (where it shows) */
function maskRect(x0, y0, x1, y1, skipX, skipY) {
  const m = new Uint8Array(W * H);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let ok = true;
    for (let k = 0; k < skipX.length; k += 2) if (x >= skipX[k] && x < skipX[k + 1]) ok = false;
    for (let k = 0; k < skipY.length; k++) if (y === skipY[k]) ok = false;
    if (ok) m[y * W + x] = 1;
  }
  return m;
}
const chicagoBg = buildChicago();
const chicagoMask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) chicagoMask[i] = chicagoBg[i] === NAVY ? 1 : 0;

/* One gym per month, in calendar order. */
const SC = [
  { name: 'CHICAGO, IL',       bg: chicagoBg,           anim: animChicago,       tone: TONE_WHITE,  shadow: BROWN, dust: 3, wk: 3, wr: 0.9,  wm: chicagoMask, wy: 5, wf: 47 },
  { name: 'ANCHORAGE, AK',     bg: buildAnchorage(),    anim: animAnchorage,     tone: TONE_WHITE,  shadow: STEEL, dust: 3, wk: 3, wr: 0.45, wm: null, wy: -3, wf: 60 },
  { name: 'NEW ORLEANS, LA',   bg: buildNola(),         anim: animNola,          tone: TONE_WHITE,  shadow: BROWN, dust: 4, wk: 0 },
  { name: 'SEATTLE, WA',       bg: buildSeattle(),      anim: animSeattle,       tone: TONE_WHITE,  shadow: NIGHT, dust: 2, wk: 4, wr: 1.6,  wm: maskRect(8, 6, 106, 56, [40, 42, 73, 75], [30]), wy: 3, wf: 56 },
  { name: 'AUSTIN, TX',        bg: buildAustin(),       anim: animAustin,        tone: TONE_WHITE,  shadow: NIGHT, dust: 2, wk: 0 },
  { name: 'VENICE BEACH, CA',  bg: buildVenice(),       anim: animVenice,        tone: TONE_CHROME, shadow: WOOD,  dust: 1, wk: 0 },
  { name: 'MIAMI, FL',         bg: buildMiami(),        anim: animMiami,         tone: TONE_WHITE,  shadow: CHAR,  dust: 2, wk: 0 },
  { name: 'PHOENIX, AZ',       bg: buildPhoenix(),      anim: animPhoenix,       tone: TONE_CHROME, shadow: WOOD,  dust: 1, wk: 0 },
  { name: 'BOULDER, CO',       bg: buildBoulder(),      anim: animBoulder,       tone: TONE_CHROME, shadow: PINE,  dust: 4, wk: 0 },
  { name: 'BURLINGTON, VT',    bg: buildVermont(),      anim: animVermont,       tone: TONE_CHROME, shadow: PINE,  dust: 4, wk: 5, wr: 0.12, wm: null, wy: 30, wf: 60 },
  { name: 'SAN FRANCISCO, CA', bg: buildSanFrancisco(), anim: animSanFrancisco,  tone: TONE_WHITE,  shadow: PINE,  dust: 4, wk: 0 },
  { name: 'MANHATTAN, NY',     bg: buildManhattan(),    anim: animManhattan,     tone: TONE_WHITE,  shadow: NIGHT, dust: 2, wk: 3, wr: 0.7,  wm: maskRect(8, 6, 152, 58, [54, 56, 104, 106], [21]), wy: 4, wf: 58 }
];
const NS = SC.length;

/* ------------------------- calendar year --------------------------- */
/* Each jump closes one month. Twelve jumps = one calendar year = two laps
   of the six gyms, so the loop is seamless. */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* ------------------------------ pose ------------------------------ */
/* ShowUp's approved jump keyframes (js/mascot-renderer.js), unchanged.
   Fields: t, x, y, sx, sy, r, bend, eye, wink, look, face, grin */
const NF = 12;
const JF = (() => {
  const n = { x: 0, y: 0, sx: 1, sy: 1, r: 0, bend: 0, eye: 1, wink: 1, look: 0, face: 0, grin: 0 };
  const key = (t, p = {}) => { const k = Object.assign({}, n, p); return [t, k.x, k.y, k.sx, k.sy, k.r, k.bend, k.eye, k.wink, k.look, k.face, k.grin]; };
  const frames = [
    key(0), key(220, { eye: 1.12, face: -8 }),
    key(570, { sx: 1.15, sy: .73, y: 0, bend: 27, eye: .32, face: 13 }),
    key(700, { sx: .85, sy: 1.23, y: -24, bend: -32, eye: 1.12, grin: .55 }),
    key(960, { sx: .96, sy: 1.04, y: -102, r: -6, bend: -19, eye: 1.16, grin: 1 }),
    key(1170, { sx: 1.03, sy: .98, y: -110, r: 5, bend: -5, eye: .82, grin: 1 }),
    key(1410, { sx: .93, sy: 1.09, y: -42, r: 2, bend: 22, eye: 1.06, grin: .75 }),
    key(1530, { sx: 1.21, sy: .65, bend: 33, eye: .12, grin: .2 }),
    key(1700, { sx: .96, sy: 1.06, y: -23, bend: -22, eye: .92, grin: .65 }),
    key(1870, { sx: 1.055, sy: .91, bend: 10, eye: .9, grin: .3 }),
    key(2080, { sx: .99, sy: 1.02, bend: -4 }), key(2300), key(2700)
  ];
  const out = new Float64Array(frames.length * NF);
  frames.forEach((f, i) => out.set(f, i * NF));
  return out;
})();
const JN = JF.length / NF;

const pose = { x: 0, y: 0, sx: 1, sy: 1, r: 0, bend: 0, eye: 1, wink: 1, look: 0, face: 0, grin: 0 };
function neutral(p) { p.x = 0; p.y = 0; p.sx = 1; p.sy = 1; p.r = 0; p.bend = 0; p.eye = 1; p.wink = 1; p.look = 0; p.face = 0; p.grin = 0; }
function idleBob(t, p) { if ((Math.floor(t / 450) & 1) === 1) { p.sy = 0.94; p.sx = 1.03; } }
function show(t, p) {
  let i = 1;
  while (i < JN - 1 && t > JF[i * NF]) i++;
  const a = (i - 1) * NF, b = i * NF;
  let q = (t - JF[a]) / (JF[b] - JF[a]); q = q < 0 ? 0 : q > 1 ? 1 : q;
  const e = q * q * (3 - 2 * q);
  p.x = JF[a + 1] + (JF[b + 1] - JF[a + 1]) * e;
  p.y = JF[a + 2] + (JF[b + 2] - JF[a + 2]) * e;
  p.sx = JF[a + 3] + (JF[b + 3] - JF[a + 3]) * e;
  p.sy = JF[a + 4] + (JF[b + 4] - JF[a + 4]) * e;
  p.r = JF[a + 5] + (JF[b + 5] - JF[a + 5]) * e;
  p.bend = JF[a + 6] + (JF[b + 6] - JF[a + 6]) * e;
  p.eye = JF[a + 7] + (JF[b + 7] - JF[a + 7]) * e;
  p.wink = JF[a + 8] + (JF[b + 8] - JF[a + 8]) * e;
  p.look = JF[a + 9] + (JF[b + 9] - JF[a + 9]) * e;
  p.face = JF[a + 10] + (JF[b + 10] - JF[a + 10]) * e;
  p.grin = JF[a + 11] + (JF[b + 11] - JF[a + 11]) * e;
}
/* IDLE (look around, blink, 2-frame breath) → JUMP → SETTLE (blue, cheeky wink) */
function evalPose(st, p) {
  neutral(p);
  if (st < J) {
    idleBob(st, p);
    if (st >= 500 && st < 900) { p.look = -20; p.r = -3; }
    else if (st >= 900 && st < 1300) { p.look = 22; p.r = 4; p.eye = 1.1; }
    if (st >= 1650 && st < 1740) p.eye = 0.15;
  } else if (st < J + JLEN) {
    show(st - J, p);
  } else {
    const u = st - J - JLEN;
    idleBob(u, p);
    p.grin = 0.35;
    if (u >= 250 && u < 580) { p.wink = 0.06; p.r = -5; p.face = -2; }
  }
}

/* --------------------------- mascot sprite -------------------------- */
/* 42x24 base sprite, same silhouette as ShowUp's Retro mascot, now with
   a three-step light ramp, a 1px outline, and a live face.             */
let eyeX = 0, eyeBot = 11, eyeTopL = 9, eyeTopR = 9, mouthMode = 0, mouthDy = 0;
function eyeRows(e) { return e > 1.1 ? 4 : e >= 0.7 ? 3 : e >= 0.35 ? 2 : 1; }
function faceSetup(p) {
  let fd = Math.round(p.face / 7); fd = fd < -1 ? -1 : fd > 1 ? 1 : fd;
  let lx = Math.round(p.look / 10); lx = lx < -2 ? -2 : lx > 2 ? 2 : lx;
  eyeX = lx; eyeBot = 11 + fd; mouthDy = fd;
  eyeTopL = eyeBot - eyeRows(p.eye) + 1;
  eyeTopR = eyeBot - eyeRows(p.eye * p.wink) + 1;
  mouthMode = p.grin < 0.45 ? 0 : p.grin < 0.8 ? 1 : 2;
}
function sample(a, b) {
  if (a < 0 || a > 41 || b < 0 || b > 23) return 0;
  const z = a < 10 ? a : a >= 32 ? a - 32 : -1;
  if (z >= 0 && ((z >= 4 && z < 7) || (b >= 2 && b < 22 && z >= 2 && z < 9) || (b >= 5 && b < 19 && z < 10))) {
    if (b >= 20 || z >= 8 || (b >= 17 && z >= 6)) return 1;
    if (z <= 2 || b <= 3) return 3;
    return 2;
  }
  if (a >= 9 && a < 33 && b >= 7 && b < 17) {
    const ea = a - eyeX;
    if (b <= eyeBot && ((ea >= 16 && ea < 19 && b >= eyeTopL) || (ea >= 23 && ea < 26 && b >= eyeTopR))) return 4;
    const mb = b - mouthDy;
    if (mouthMode === 0) { if ((mb === 14 && (ea === 18 || ea === 23)) || (mb === 15 && ea >= 19 && ea < 23)) return 4; }
    else if (mouthMode === 1) { if ((mb === 14 && (ea === 17 || ea === 24)) || (mb === 15 && ea >= 18 && ea < 24)) return 4; }
    else if ((mb === 13 || mb === 14) && ea >= 18 && ea < 24 || (mb === 15 && ea >= 19 && ea < 23)) return 4;
    if (b <= 8) return 3;
    if (b >= 15) return 1;
    if (a === 11 && b >= 9 && b <= 14) return 3;
    return 2;
  }
  return 0;
}
/* Parameters animate smoothly; the sprite is re-sampled on the pixel grid,
   so every frame lands on whole pixels. */
let mCx = CX, mBase = FLOOR + 1, mLift = 0;
function placeMascot(p) {
  const rr = p.r * Math.PI / 180;
  mLift = -p.y * 0.26 + Math.abs(Math.sin(rr)) * 16;
  mCx = CX + Math.round(p.x * 0.3);
  mBase = FLOOR + 1 - Math.round(mLift);
}
function drawMascot(B, p, tone) {
  placeMascot(p);
  faceSetup(p);
  const rr = p.r * Math.PI / 180, cs = Math.cos(rr), sn = Math.sin(rr);
  const sx = 1 + (p.sx - 1) * 0.8, sy = 1 + (p.sy - 1) * 0.8, bend = p.bend * 0.07;
  MB.fill(0);
  let y0 = mBase - 44, y1 = mBase + 3, x0 = mCx - 36, x1 = mCx + 36;
  if (y0 < 1) y0 = 1; if (y1 > H - 1) y1 = H - 1; if (x0 < 1) x0 = 1; if (x1 > W - 1) x1 = W - 1;
  for (let y = y0; y < y1; y++) {
    const dy = y + 0.5 - mBase;
    for (let x = x0; x < x1; x++) {
      const dx = x + 0.5 - mCx;
      const lx = (dx * cs + dy * sn) / sx, ly = (-dx * sn + dy * cs) / sy;
      const n = lx / 21;
      const s = sample(Math.floor(lx + 21), Math.floor(ly + 24 + bend * n * n));
      if (s) MB[y * W + x] = s;
    }
  }
  const to = tone * 5;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, s = MB[i];
    if (s) B[i] = TONES[to + s];
    else if (MB[i - 1] || MB[i + 1] || MB[i - W] || MB[i + W]) B[i] = OUT;
  }
}
function drawShadow(B, c) {
  let k = 1 - mLift / 34; if (k < 0.35) k = 0.35;
  const w = Math.round(36 * k) & ~1;
  rect(B, mCx - (w >> 1), FLOOR + 1, w, 1, c);
  rect(B, mCx - (w >> 1) + 3, FLOOR + 2, w - 6, 1, c);
}

/* ---------------------------- particles ----------------------------- */
/* Preallocated pool. Colour steps down a palette ramp; no alpha. */
const PMAX = 480;
const pX = new Float32Array(PMAX), pY = new Float32Array(PMAX), pVX = new Float32Array(PMAX), pVY = new Float32Array(PMAX);
const pLife = new Float32Array(PMAX), pMax = new Float32Array(PMAX), pG = new Float32Array(PMAX), pDrag = new Float32Array(PMAX);
const pRamp = new Uint8Array(PMAX), pKind = new Uint8Array(PMAX);   // kind 0 dead, 1 spark, 2 dust, 3 snow, 4 rain, 5 leaf
const pScene = new Uint8Array(PMAX), pFloor = new Float32Array(PMAX);
let pNext = 0;
const RAMPS = new Uint8Array([
  W_LT, SKY_LT, B_LT, B_SH,        // 0 spark: white → ShowUp blue → dark
  W_LT, SUN, SAND, WOOD,           // 1 beach sand
  STEEL_LT, STEEL, STEEL_D, CHAR,  // 2 gym-floor dust
  W_LT, STEEL_LT, STEEL, STEEL_D,  // 3 chalk
  SUN, SAND, WOOD, BROWN,          // 4 trail dirt
  W_LT, W_LT, STEEL_LT, STEEL_LT,  // 5 snow
  W_LT, SUN, AMBER, B_MID,         // 6 year-end gold
  SKY_LT, STEEL_LT, STEEL_LT, STEEL, // 7 rain
  CORAL, CORAL, CORAL, BRICK,      // 8 leaf
  AMBER, AMBER, AMBER, WOOD,       // 9 leaf
  RED, RED, RED, BROWN             // 10 leaf
]);
function spawn(kind, x, y, vx, vy, life, g, drag, ramp) {
  const i = pNext; pNext = (pNext + 1) % PMAX;
  pKind[i] = kind; pX[i] = x; pY[i] = y; pVX[i] = vx; pVY[i] = vy;
  pLife[i] = life; pMax[i] = life; pG[i] = g; pDrag[i] = drag; pRamp[i] = ramp;
  pScene[i] = 255; pFloor[i] = H + 2;
  return i;
}
function weather(si) {
  const s = SC[si];
  if (!s.wk) return;
  for (let n = s.wr; n > 0; n -= 1) {
    if (n < 1 && Math.random() >= n) break;
    const x = Math.random() * W, y = s.wy + Math.random() * 4;
    let i;
    if (s.wk === 3) i = spawn(3, x, y, 0, 0.2 + Math.random() * 0.14, 600, 0, 1, 5);
    else if (s.wk === 4) i = spawn(4, x, y, -0.12, 1.5 + Math.random() * 0.5, 120, 0, 1, 7);
    else i = spawn(5, x, y, 0.12 + Math.random() * 0.2, 0.22 + Math.random() * 0.14, 900, 0, 1, 8 + ((Math.random() * 3) | 0));
    pScene[i] = si;
    pFloor[i] = s.wm ? s.wf : s.wf + Math.random() * (H - s.wf - 2);
  }
}
function burst(x, y, n, ramp, speed) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.45 + Math.random() * 0.8);
    spawn(1, x, y, Math.cos(a) * s, Math.sin(a) * s - 0.25, 28 + Math.random() * 26, 0.012, 0.955, ramp);
  }
}
function dust(n, ramp) {
  for (let k = 0; k < n; k++) {
    const side = k & 1 ? 1 : -1;
    spawn(2, mCx + side * (13 + Math.random() * 8), FLOOR - Math.random() * 2,
      side * (0.35 + Math.random() * 1.1), -(0.08 + Math.random() * 0.45), 16 + Math.random() * 16, 0.018, 0.9, ramp);
  }
}
function stepParticles() {
  for (let i = 0; i < PMAX; i++) {
    if (!pKind[i]) continue;
    pVY[i] += pG[i]; pVX[i] *= pDrag[i]; pVY[i] *= pDrag[i];
    pX[i] += pVX[i]; pY[i] += pVY[i];
    const k = pKind[i];
    if (k === 3) pX[i] += Math.sin(pY[i] * 0.3 + i) * 0.08;
    else if (k === 5) pX[i] += Math.sin(pY[i] * 0.16 + i) * 0.3;
    if (--pLife[i] <= 0 || pY[i] > pFloor[i]) pKind[i] = 0;
  }
}
function drawParticles(B, front, curI, nxI, th) {
  for (let i = 0; i < PMAX; i++) {
    const k = pKind[i];
    if (!k || (k >= 3) === front) continue;
    const x = Math.floor(pX[i]), y = Math.floor(pY[i]);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const age = 1 - pLife[i] / pMax[i];
    const idx = y * W + x;
    if (k >= 3) {
      const shown = th > 0 && BAYER[(x & 3) | ((y & 3) << 2)] < th ? nxI : curI;
      if (pScene[i] !== shown) continue;
      const m = SC[shown].wm;
      if (m && !m[idx]) continue;
      const c = RAMPS[pRamp[i] * 4 + (k === 3 ? 0 : (age * 3.999 | 0))];
      B[idx] = c;
      if (k === 4 && y > 0 && (!m || m[idx - W])) B[idx - W] = c;
      if (k === 5 && ((y >> 2) & 1) && x + 1 < W) B[idx + 1] = c;
      continue;
    }
    const c = RAMPS[pRamp[i] * 4 + (age * 3.999 | 0)];
    B[idx] = c;
    if (k === 1 && age < 0.3 && (i % 3) === 0) { px(B, x - 1, y, c); px(B, x + 1, y, c); px(B, x, y - 1, c); px(B, x, y + 1, c); }
  }
}

/* --------------------------- display setup --------------------------- */
const sctx = screen.getContext('2d');
const off = document.createElement('canvas'); off.width = W; off.height = H;
const octx = off.getContext('2d');
const img = octx.createImageData(W, H);
const img32 = new Uint32Array(img.data.buffer);
let scale = 1, ox = 0, oy = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  screen.width = Math.max(1, Math.round(window.innerWidth * dpr));
  screen.height = Math.max(1, Math.round(window.innerHeight * dpr));
  /* v4.6.135 (in the app): whole pixels when that costs almost nothing, else
     fill -- sideways the film should BE the screen, not float in bars. */
  const exact = Math.min(screen.width / W, screen.height / H), whole = Math.max(1, Math.floor(exact));
  scale = (exact - whole) / exact < 0.04 ? whole : exact;
  ox = Math.floor((screen.width - W * scale) / 2);
  oy = Math.floor((screen.height - H * scale) / 2);
  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();
let raf = 0, stopped = false;

/* ------------------------------ state ------------------------------- */
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sim = 0, shake = 0, last = -1, acc = 0;
const poseU = { x: 0, y: 0, sx: 1, sy: 1, r: 0, bend: 0, eye: 1, wink: 1, look: 0, face: 0, grin: 0 };

function update() {
  const prev = sim; sim += STEP;
  const cyc = Math.floor(sim / SCENE_MS), cs = cyc * SCENE_MS, st = sim - cs, ps = prev - cs;
  const si = cyc % NS, sc = SC[si];
  if (ps < J + 960 && st >= J + 960) {
    evalPose(st, poseU); placeMascot(poseU);
    burst(mCx, mBase - 12, 22, 0, 1.5);
  }
  if (ps < J + 1530 && st >= J + 1530) {
    evalPose(st, poseU); placeMascot(poseU);
    dust(16, sc.dust); shake = 10;
    if (cyc % 12 === 11) { burst(mCx, mBase - 14, 36, 6, 2.1); burst(mCx, 30, 20, 0, 1.2); }
  }
  if (ps < J + 1870 && st >= J + 1870) { evalPose(st, poseU); placeMascot(poseU); dust(6, sc.dust); }
  weather(si);
  if (st >= T0) weather((cyc + 1) % NS);
  stepParticles();
  if (shake > 0) shake--;
}

function render() {
  const cyc = Math.floor(sim / SCENE_MS), st = sim - cyc * SCENE_MS;
  const curI = cyc % NS, nxI = (cyc + 1) % NS, sc = SC[curI], nx = SC[nxI];
  const tq = Math.floor(st / QF) * QF;

  fb.set(sc.bg); sc.anim(fb, tq);
  let showNext = false, th = 0;
  if (st >= T0) {
    const p = (tq - T0) / (SCENE_MS - T0);
    fb2.set(nx.bg); nx.anim(fb2, tq);
    th = Math.floor(p * 17);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (BAYER[(x & 3) | ((y & 3) << 2)] < th) fb[y * W + x] = fb2[y * W + x];
    showNext = p >= 0.5;
  }

  drawParticles(fb, false, curI, nxI, th);

  evalPose(RM ? 0 : tq, pose);
  let tone = showNext ? nx.tone : sc.tone;
  if (!showNext && tq >= J + 900) tone = tq < J + 900 + QF ? TONE_FLASH : TONE_BLUE;
  placeMascot(pose);
  drawShadow(fb, showNext ? nx.shadow : sc.shadow);
  drawMascot(fb, pose, tone);
  drawParticles(fb, true, curI, nxI, th);

  const landed = st >= J + 1530;
  const month = (showNext ? cyc + 1 : cyc) % 12;
  const done = showNext ? month : month + (landed ? 1 : 0);
  const yearDone = done === 12;

  // HUD: month + twelve squares that fill as each month is closed
  box(fb, 4, 4, 52, NIGHT, yearDone ? B_MID : STEEL_D);
  text(fb, MONTHS[month], 6, 6, yearDone ? SUN : W_LT);
  for (let k = 0; k < 12; k++) {
    const c = k < done ? (yearDone ? SUN : B_LT) : k === month ? STEEL : STEEL_D;
    rect(fb, 20 + k * 3, 7, 2, 3, c);
  }
  box(fb, W - 4 - 27, 4, 27, B_MID, B_SH);
  text(fb, 'SHOWUP', W - 4 - 25, 6, W_LT);
  const name = showNext ? nx.name : sc.name;
  const nw = name.length * 4 - 1 + 4;
  box(fb, 4, H - 13, nw, NIGHT, STEEL_D);
  text(fb, name, 6, H - 11, W_LT);

  for (let i = 0; i < W * H; i++) img32[i] = PAL32[fb[i]];
  octx.putImageData(img, 0, 0);
  const sy = shake > 0 ? (((shake >> 2) & 1) ? 1 : -1) : 0;
  sctx.fillStyle = '#0B0D14';
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(off, 0, 0, W, H, ox, oy + sy * scale, W * scale, H * scale);
}

function frame(now) {
  if (RM) {
    sim = Math.floor(now / 5000) * SCENE_MS;
    render();
    if (!stopped) raf = requestAnimationFrame(frame);
    return;
  }
  if (last < 0) last = now;
  let dt = now - last; last = now;
  if (dt > 250) dt = 250;
  acc += dt;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  if (!stopped) raf = requestAnimationFrame(frame);
}
const onVis = () => { last = -1; };
document.addEventListener('visibilitychange', onVis);

raf = requestAnimationFrame(frame);
return {
  stop() { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); },
  /* for the checks: jump to a moment, __seek(gymIndex, msIntoGym) in the film */
  seek(g, ms) { sim = g * SCENE_MS; pKind.fill(0); while (sim < g * SCENE_MS + ms) update(); render(); }
};
}
