/**
 * Пустошь: обломки на дороге не только из попуток — подбитый танк, кусок фюзеляжа упавшего самолёта, рухнувший вертолёт,
 * бензовоз-цистерна, брошенный трактор. Каждый умещается в своей полосе (ширина по x — не больше ±0.7, полоса — ±1),
 * длинное — вдоль дороги. Перёд модели — к −z, низ — на y = 0.
 * Цвета — «заводские»: копоть и ржавчину накладывает dressWreck (src/wrecks.js).
 *
 * WRECK_MODELS[kind](r) → { group, hitW, hitL }. Высокие (вертолёт, бензовоз, трактор) с места не перепрыгнуть — TALL_H в src/traffic-cars.js.
 */
import * as THREE from 'three';

const mats = {};
function M(h) { return mats[h] || (mats[h] = new THREE.MeshStandardMaterial({ color: h, roughness: 0.85, flatShading: true })); }
const geos = {};
function G(k, make) { if (!geos[k]) { geos[k] = make(); geos[k].userData.keep = true; } return geos[k]; }
const BOX = function() { return G('box', function() { return new THREE.BoxGeometry(1, 1, 1); }); };
const CYL = function() { return G('cyl', function() { return new THREE.CylinderGeometry(1, 1, 1, 12); }); };
const CONE = function() { return G('cone', function() { return new THREE.CylinderGeometry(0.35, 1, 1, 12); }); };
const SPH = function() { return G('sph', function() { return new THREE.SphereGeometry(1, 10, 8); }); };

/** Деталь: geo, цвет, позиция [x,y,z], размер [sx,sy,sz], поворот [rx,ry,rz] */
function part(g, geo, color, p, s, rot) {
    const m = new THREE.Mesh(geo, M(color));
    m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.castShadow = true; g.add(m); return m;
}
/** Колесо (ось — по x): радиус r, ширина w */
function wheel(g, x, y, z, r, w, color) { return part(g, CYL(), color || 0x161616, [x, y, z], [r, w, r], [0, 0, Math.PI / 2]); }
/** Цилиндр вдоль дороги (ось — по z) */
function alongZ(g, geo, color, p, r, len) { return part(g, geo, color, p, [r, len, r], [Math.PI / 2, 0, 0]); }

/** Подбитый танк: низкий корпус на гусеницах, башня, длинный ствол чуть опущен, бочки на корме */
function tank(r) {
    const g = new THREE.Group(), OL = 0x4a5a2a, DK = 0x23271a, TR = 0x161616;
    part(g, BOX(), OL, [0, 0.47, 0], [0.88, 0.32, 2.15]);
    part(g, BOX(), OL, [0, 0.42, -1.15], [0.88, 0.22, 0.42], [-0.55, 0, 0]);
    [-1, 1].forEach(function(s) {
        part(g, BOX(), TR, [s * 0.52, 0.25, 0], [0.22, 0.4, 2.35]);
        for (let i = 0; i < 6; i++) wheel(g, s * 0.63, 0.2, -0.95 + i * 0.38, 0.15, 0.04, DK);
        part(g, BOX(), DK, [s * 0.5, 0.48, 0], [0.32, 0.04, 2.3]);
    });
    part(g, CYL(), OL, [0, 0.76, 0.12], [0.44, 0.26, 0.5]);
    part(g, CYL(), DK, [0, 0.93, 0.25], [0.12, 0.06, 0.12]);
    const droop = 0.06 + r() * 0.12;
    part(g, CYL(), DK, [0, 0.76 - droop * 0.8, -0.95], [0.045, 1.55, 0.045], [Math.PI / 2 - droop, 0, 0]);
    [-0.25, 0.25].forEach(function(x) { part(g, CYL(), 0x3a3020, [x, 0.75, 1.05], [0.1, 0.36, 0.1], [Math.PI / 2, 0, 0]); });
    return { group: g, hitW: 1.05, hitL: 2.4 };
}

/** Кусок фюзеляжа самолёта: белая труба с окнами, рваный перёд, хвост с килем и обрубки крыльев */
function plane(r) {
    const g = new THREE.Group(), W = 0xd8d4c8, ST = 0x2a4a8a, DK = 0x1a1a1a;
    alongZ(g, CYL(), W, [0, 0.5, -0.2], 0.48, 2.4);
    alongZ(g, CYL(), ST, [0, 0.5, -0.2], 0.485, 0.18).position.z = 0.6;
    alongZ(g, CONE(), W, [0, 0.56, 1.4], 0.48, 0.9); // хвост сужается назад
    part(g, G('torn', function() { return new THREE.CircleGeometry(0.44, 12); }), DK, [0, 0.5, -1.41], [1, 1, 1], [0, Math.PI, 0]);
    part(g, BOX(), W, [0, 1.15, 1.6], [0.06, 0.85, 0.55], [0.35, 0, 0]);
    part(g, BOX(), ST, [0, 1.42, 1.72], [0.065, 0.3, 0.4], [0.35, 0, 0]);
    part(g, BOX(), W, [0, 0.66, 1.7], [1.3, 0.04, 0.32]);
    [-1, 1].forEach(function(s) {
        part(g, BOX(), W, [s * 0.58, 0.32, -0.2], [0.3, 0.06, 0.75], [0, 0, s * (0.08 + r() * 0.1)]); // обрубки крыльев — в пределах полосы
        for (let i = 0; i < 8; i++) part(g, BOX(), DK, [s * 0.47, 0.66, -1.1 + i * 0.25], [0.03, 0.09, 0.12]);
    });
    return { group: g, hitW: 1.0, hitL: 3.0 };
}

/** Рухнувший вертолёт: округлая кабина с остеклением, горб двигателя, хвостовая балка с килем, лопасти крест-накрест */
function heli(r) {
    const g = new THREE.Group(), OL = 0x4f5a34, DK = 0x1c2018, GL = 0x22303a;
    part(g, SPH(), OL, [0, 0.5, -0.1], [0.46, 0.44, 0.95]);
    part(g, SPH(), GL, [0, 0.62, -0.78], [0.36, 0.26, 0.3]);
    part(g, BOX(), OL, [0, 0.98, 0.05], [0.42, 0.22, 0.8]);
    alongZ(g, CYL(), OL, [0, 0.72, 1.3], 0.1, 1.5).scale.x = 0.08;
    part(g, BOX(), OL, [0, 1.0, 2.0], [0.06, 0.6, 0.3], [0.35, 0, 0]);
    [0, 1, 2].forEach(function(i) { part(g, BOX(), DK, [0.07, 1.05, 2.02], [0.02, 0.48, 0.05], [i * 1.05, 0, 0]); });
    part(g, CYL(), DK, [0, 1.15, 0.05], [0.07, 0.14, 0.07]);
    const bend = 0.08 + r() * 0.1;
    [-1, 1].forEach(function(s) { part(g, BOX(), DK, [0, 1.2, 0.05], [0.12, 0.025, 2.1], [s * bend, s * 0.45, 0]); });
    [-1, 1].forEach(function(s) { part(g, BOX(), DK, [s * 0.36, 0.08, -0.1], [0.04, 0.04, 1.3]); });
    return { group: g, hitW: 1.0, hitL: 3.0 };
}

/** Бензовоз: кабина, рама, ржавая цистерна, знак «огнеопасно» сзади */
function tanker(r) {
    const g = new THREE.Group(), CAB = r() < 0.5 ? 0x2a5a8a : 0x8a2a1e, TK = r() < 0.5 ? 0xc8c4b8 : 0xb8742e, DK = 0x161616, GL = 0x22303a;
    part(g, BOX(), CAB, [0, 0.72, -1.05], [0.88, 0.75, 0.72]);
    part(g, BOX(), GL, [0, 0.9, -1.42], [0.72, 0.3, 0.03]);
    part(g, BOX(), 0x333333, [0, 0.3, 0.1], [0.78, 0.14, 2.6]);
    alongZ(g, CYL(), TK, [0, 0.92, 0.38], 0.46, 1.85);
    part(g, CYL(), TK, [0, 0.92, -0.55], [0.46, 0.02, 0.46], [Math.PI / 2, 0, 0]);
    part(g, CYL(), 0x555555, [0, 1.4, 0.38], [0.14, 0.06, 0.14]);
    part(g, BOX(), 0xd86a10, [0, 0.95, 1.33], [0.3, 0.3, 0.02]);
    [-0.85, 0.55, 1.0].forEach(function(z) { [-1, 1].forEach(function(s) { wheel(g, s * 0.4, 0.24, z, 0.24, 0.16, DK); }); });
    return { group: g, hitW: 0.95, hitL: 2.75 };
}

/** Брошенный трактор «Беларус»: красный капот, высокая кабина, большие задние колёса */
function tractor() {
    const g = new THREE.Group(), RD = 0x9a2a1e, DK = 0x161616, GL = 0x22303a;
    part(g, BOX(), RD, [0, 0.72, -0.3], [0.5, 0.42, 0.95]);
    part(g, BOX(), 0x333333, [0, 0.4, -0.1], [0.42, 0.2, 1.4]);
    part(g, BOX(), RD, [0, 1.25, 0.38], [0.75, 0.08, 0.62]);
    part(g, BOX(), GL, [0, 1.0, 0.38], [0.7, 0.45, 0.56]);
    [-1, 1].forEach(function(s) { [-1, 1].forEach(function(t) { part(g, BOX(), RD, [s * 0.35, 1.0, 0.38 + t * 0.29], [0.04, 0.5, 0.04]); }); });
    part(g, CYL(), DK, [0.12, 1.1, -0.65], [0.04, 0.5, 0.04]);
    [-1, 1].forEach(function(s) { wheel(g, s * 0.5, 0.5, 0.4, 0.5, 0.24); wheel(g, s * 0.38, 0.28, -0.62, 0.28, 0.16); });
    return { group: g, hitW: 1.05, hitL: 1.75 };
}

export const WRECK_MODELS = { tank: tank, plane: plane, heli: heli, tanker: tanker, tractor: tractor };
