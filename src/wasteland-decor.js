/**
 * Пустошь: отголоски апокалипсиса вдоль дороги — выгоревшие машины на обочине, упавшие самолёты, брошенная военная
 * техника, баррикады из бетона и шин, воронки, мёртвые деревья, столбы дыма на горизонте, трещины и гарь на асфальте.
 * На дороге (в полосах) здесь ничего не ставится — объезжать надо обломки из src/wrecks.js и зверей.
 *
 * planWaste(d0, d1, r) — что и где поставить (чистая функция, тест), buildWaste(item, r) — модель.
 * x у предметов: side −1/1 — обочина слева/справа, off — от края дороги (ед.); 'crack' — по асфальту, x — сам по себе.
 */
import * as THREE from 'three';
import { makeWreck, wreckFx, buildBtr } from './wrecks.js';
import { mergeCarParts } from './merge-static.js';

/** Шаг придорожных предметов, м; крупные «ориентиры» (самолёт, БТР, автобус) — реже */
export const SIDE_EVERY = [14, 26];
export const LANDMARK_EVERY = [260, 420];
export const PLUME_EVERY = [55, 95];
export const CRACK_EVERY = [6, 13];
const SIDE_KINDS = ['shell', 'shell', 'shell', 'barricade', 'crater', 'deadtree', 'deadtree', 'tires'];
const LANDMARKS = ['plane', 'btr', 'bus'];

/** План участка [d0, d1): [{ kind, d, side, off, x? }] — по дальности от старта */
export function planWaste(d0, d1, r) {
    const out = [];
    const step = function(a) { return a[0] + r() * (a[1] - a[0]); };
    const first = function(every) { return d0 + r() * every[0]; };
    for (let d = first(SIDE_EVERY); d < d1; d += step(SIDE_EVERY)) out.push({ kind: SIDE_KINDS[Math.floor(r() * SIDE_KINDS.length)], d: d, side: r() < 0.5 ? -1 : 1, off: 1.2 + r() * 3.5 });
    for (let d = first(LANDMARK_EVERY) + 60; d < d1; d += step(LANDMARK_EVERY)) out.push({ kind: LANDMARKS[Math.floor(r() * LANDMARKS.length)], d: d, side: r() < 0.5 ? -1 : 1, off: 3 + r() * 2 });
    for (let d = first(PLUME_EVERY); d < d1; d += step(PLUME_EVERY)) out.push({ kind: 'plume', d: d, side: r() < 0.5 ? -1 : 1, off: 14 + r() * 40 });
    for (let d = first(CRACK_EVERY); d < d1; d += step(CRACK_EVERY)) out.push({ kind: r() < 0.3 ? 'scorch' : 'crack', d: d, x: (r() - 0.5) * 5.6, side: 0, off: 0 });
    return out.sort(function(a, b) { return a.d - b.d; });
}

/* ---------- модели ---------- */
const mats = {};
function M(h, o) { const k = h + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: h, roughness: 0.92, flatShading: true }, o || {}))); }
const geos = {};
function G(key, make) { if (!geos[key]) { geos[key] = make(); geos[key].userData.keep = true; } return geos[key]; }
function mesh(geo, mat, x, y, z, rx, ry, rz, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; parent.add(m); return m; }

let puff = null, decal = {};
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true; return t; }
function puffTex() {
    return puff || (puff = canvasTex(64, 64, function(x) { for (let i = 0; i < 7; i++) { const px = 20 + (i * 37) % 24, py = 20 + (i * 53) % 24, rr = 12 + (i % 3) * 4; const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); } }));
}
/** Трещина или пятно гари на асфальте: прозрачная картинка, лежит на дороге */
function decalMat(kind) {
    if (decal[kind]) return decal[kind];
    const t = canvasTex(128, 128, function(x, w, h) {
        if (kind === 'scorch') { const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(12,10,8,0.85)'); g.addColorStop(0.6, 'rgba(20,16,12,0.45)'); g.addColorStop(1, 'rgba(20,16,12,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); return; }
        x.strokeStyle = 'rgba(14,12,10,0.9)'; x.lineCap = 'round';
        for (let k = 0; k < 3; k++) { let px = 64, py = 64, a = k * 2.1 + 0.3; x.lineWidth = 3.2 - k * 0.6; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 6; s++) { a += Math.sin(k * 7 + s * 3.3) * 0.7; px += Math.cos(a) * 11; py += Math.sin(a) * 11; x.lineTo(px, py); } x.stroke(); }
    });
    return (decal[kind] = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
}
const plumeMats = [];
function plumeMat(i) {
    if (!plumeMats[i]) { const v = 0.12 + i * 0.05; plumeMats[i] = new THREE.SpriteMaterial({ map: puffTex(), color: new THREE.Color().setRGB(v, v * 0.94, v * 0.88, THREE.SRGBColorSpace), transparent: true, opacity: 0.85 - i * 0.08, depthWrite: false, fog: false }); }
    return plumeMats[i];
}

function plane(g) {
    const AL = M(0xb8bcbc, { roughness: 0.7 }), SO = M(0x2a2522), ST = M(0x7a3a2a), WIN = M(0x1a1d22);
    const cylX = function(r1, r2, len, mat, x, y, z, ry, rz) { return mesh(G('cyl' + r1 + r2 + len, function() { return new THREE.CylinderGeometry(r1, r2, len, 10); }), mat, x, y, z, 0, ry || 0, Math.PI / 2 + (rz || 0), g); };
    cylX(0.42, 0.42, 2.6, AL, -1.3, 0.42, 0, 0.15);
    cylX(0.1, 0.42, 0.8, AL, -3.0, 0.44, -0.25, 0.15);
    cylX(0.42, 0.24, 1.9, AL, 1.5, 0.5, 0.4, -0.5, 0.12);
    mesh(G('tail', function() { return new THREE.BoxGeometry(0.7, 0.95, 0.08); }), ST, 2.3, 1.1, 0.85, 0, -0.5, -0.35);
    mesh(G('wing', function() { return new THREE.BoxGeometry(0.7, 0.06, 3.2); }), AL, -1.1, 0.24, -1.8, 0.12, 0.15, 0.05);
    mesh(G('wing2', function() { return new THREE.BoxGeometry(0.7, 0.06, 1.5); }), AL, -0.9, 0.16, 1.3, -0.25, 0.1, 0.1);
    for (let i = 0; i < 6; i++) mesh(G('pwin', function() { return new THREE.BoxGeometry(0.03, 0.12, 0.11); }), WIN, -2.3 + i * 0.3, 0.58, -0.41 - i * 0.045, 0, 0.15, 0);
    for (let i = 0; i < 5; i++) mesh(G('shard', function() { return new THREE.BoxGeometry(0.3, 0.04, 0.22); }), SO, 0.1 + i * 0.12, 0.2 + (i % 3) * 0.25, -0.3 + i * 0.15, i, i * 2, i * 3);
}
function barricade(g, r) {
    const CON = M(0x9a958a), RED = M(0xa83a2a), TY = M(0x161616);
    for (let i = 0; i < 3; i++) { const b = mesh(G('block', function() { return new THREE.BoxGeometry(0.9, 0.42, 0.32); }), i === 1 ? RED : CON, (i - 1) * 0.95, 0.21, (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.4, 0, g); b.receiveShadow = true; }
    for (let i = 0; i < 3; i++) mesh(G('tire', function() { return new THREE.TorusGeometry(0.22, 0.09, 6, 12); }), TY, -0.6 + i * 0.5, 0.09, 0.45, Math.PI / 2, 0, 0, g);
}
function tires(g) {
    const TY = M(0x161616);
    for (let i = 0; i < 5; i++) mesh(G('tire', function() { return new THREE.TorusGeometry(0.22, 0.09, 6, 12); }), TY, (i % 2) * 0.12, 0.09 + i * 0.17, 0, Math.PI / 2, 0, 0, g);
}
function crater(g) {
    const m = mesh(G('crater', function() { return new THREE.CircleGeometry(1.1, 14); }), decalMat('scorch'), 0, 0.03, 0, -Math.PI / 2, 0, 0, g); m.castShadow = false;
    const RU = M(0x6a5a4a);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(G('rubble', function() { return new THREE.DodecahedronGeometry(0.16, 0); }), RU, Math.cos(a) * 1.05, 0.08, Math.sin(a) * 1.05, i, i, 0, g); }
}
function deadTree(g, r) {
    const W = M(0x3e2c1e);
    const t = mesh(G('trunk', function() { return new THREE.CylinderGeometry(0.06, 0.11, 1.6, 6); }), W, 0, 0.8, 0, 0, 0, (r() - 0.5) * 0.2, g); t.castShadow = true;
    for (let i = 0; i < 4; i++) mesh(G('branch', function() { return new THREE.CylinderGeometry(0.02, 0.045, 0.7, 5); }), W, 0, 1.1 + i * 0.13, 0, r() - 0.5, i * 1.7, (i % 2 ? -1 : 1) * (0.7 + r() * 0.4), g);
}
function plume(g, r) {
    const n = 7, drift = (r() - 0.5) * 3;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), s = new THREE.Sprite(plumeMat(i)); const sz = 2.5 + t * 7; s.scale.set(sz, sz, 1); s.position.set(drift * t * t * 3, 1.5 + t * 14, t * 2); g.add(s); }
}

/** Модель предмета (группа с началом на земле); r — генератор [0,1) */
export function buildWaste(it, r) {
    const g = new THREE.Group(); g.name = 'waste:' + it.kind;
    if (it.kind === 'shell' || it.kind === 'bus') {
        const w = makeWreck(it.kind === 'bus' ? 'bus' : ['sedan', 'van', 'suv'][Math.floor(r() * 3)], [0x3366ff, 0x33cc33, 0xffff00, 0xff6600][Math.floor(r() * 4)], r);
        g.add(w.group); g.rotation.y = (r() - 0.5) * 1.6;
        try { mergeCarParts(g, { all: true }); } catch (e) {}
        wreckFx(g, w.pose, r);
    } else if (it.kind === 'plane') { plane(g); g.rotation.y = (r() - 0.5) * 1.2; }
    else if (it.kind === 'btr') { g.add(buildBtr(null)); g.rotation.y = (r() - 0.5) * 1.4; wreckFx(g, { smoke: true, fire: r() < 0.5 }, r); }
    else if (it.kind === 'barricade') barricade(g, r);
    else if (it.kind === 'tires') tires(g);
    else if (it.kind === 'crater') crater(g);
    else if (it.kind === 'deadtree') deadTree(g, r);
    else if (it.kind === 'plume') plume(g, r);
    else if (it.kind === 'crack' || it.kind === 'scorch') { const m = mesh(G('decal', function() { return new THREE.PlaneGeometry(1.6, 1.6); }), decalMat(it.kind), 0, 0.025, 0, -Math.PI / 2, 0, r() * 6, g); m.castShadow = false; m.renderOrder = 1; }
    return g;
}

/** Неподвижные целиком (без дыма-спрайтов): после постановки — freezeStatic (src/inf-world.js) */
export function isStaticWaste(kind) { return ['plane', 'barricade', 'tires', 'crater', 'deadtree', 'crack', 'scorch'].indexOf(kind) >= 0; }

/** x предмета: на обочине по side/off (trackWidth — ширина дороги) или по асфальту для трещин */
export function wasteX(it, trackWidth) { return it.side ? it.side * (trackWidth / 2 + it.off) : it.x; }
