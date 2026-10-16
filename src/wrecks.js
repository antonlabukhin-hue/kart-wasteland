/**
 * Пустошь: попутки стоят на трассе разбитыми — выгоревшие, перевёрнутые, на боку, с дымом и огнём.
 * Их надо объезжать (столкновение — как с попуткой: краем — скользнул, лбом — авария), а главная угроза — звери.
 *
 * burnHex — цвет детали после пожара (чистая функция, тест), wreckPose — как лежит обломок,
 * dressWreck — перекрасить и уложить модель попутки (до слияния деталей), wreckFx — дым и огонь над ней,
 * buildBtr — разбитый БТР (вид 'btr') со зверем на крыше.
 * Всё случайное — через r() [0,1), чтобы раскладка повторялась по сиду.
 */
import * as THREE from 'three';
import { buildTraffic } from './traffic-cars.js';
import { makeAnimal } from './zombie-look.js';
import { WRECK_MODELS } from './wreck-models.js';

/**
 * Раскладка обломков (было 14–22 на дороге, в ближних 120 ед. — в среднем 12, по две полосы закрыты в пяти рядах:
 * не объехать и не стряхнуть зверя с капота):
 *   WRECK_BASE — сколько стоит на дороге с начала, wreckCount(extra) — сколько добавить с ростом сложности
 *   (rampAt().traffic 0 → 4) → всего 8 … 12; WRECK_GAP — обломки не ближе друг к другу по ходу (в любой полосе):
 *   в каждом ряду — один обломок, две полосы свободны; spreadZ — сдвинуть место вперёд, пока не соблюдён зазор.
 */
export const WRECK_BASE = 8, WRECK_GAP = 18;
export function wreckCount(extra) { return Math.round(extra || 0); }

/** z для нового обломка не ближе gap к другим машинам (дальше по ходу — к −z); skip — не считать эту */
export function spreadZ(cars, z, gap, skip) {
    const g = gap || WRECK_GAP;
    for (let k = 0; k < 40; k++) {
        let near = null;
        (cars || []).forEach(function(c) { if (c && c !== skip && c.active !== false && Math.abs(c.z - z) < g && (near === null || c.z < near)) near = c.z; });
        if (near === null) return z;
        z = near - g;
    }
    return z;
}

/**
 * Место для обломка: и не над разломом/трамплином (free(z) → z, из main.js freeZ), и не ближе gap к другим.
 * free двигает шагами и может снова поставить вплотную — повторяем, пока оба условия не сойдутся.
 */
export function placeWreck(cars, z, car, free, gap) {
    let p = z;
    for (let k = 0; k < 6; k++) {
        const s = spreadZ(cars, p, gap, car), f = free ? free(s) : s;
        if (spreadZ(cars, f, gap, car) === f) return f;
        p = f - 1;
    }
    return free ? free(p) : p;
}

/** Сколько впереди расчистить, пока зверь на капоте: hold — сколько висит (с), ups — скорость (ед./с) */
export const LATCH_CALM_K = 0.65; // тишина на 35% короче: стряхнул — и сразу снова дорога (было: весь захват + 1.5 с)
export function latchClear(hold, ups) { return Math.max(70, (ups || 0) * (hold + 1.5)) * LATCH_CALM_K; }

/** Виды обломков на дороге: попутки из src/traffic-cars.js, БТР и src/wreck-models.js (танк, самолёт, вертолёт, бензовоз, трактор); мотоциклов нет — мелкие, не читаются */
export const WRECK_KINDS = ['sedan', 'sedan', 'van', 'suv', 'truck', 'bus', 'btr', 'tank', 'plane', 'heli', 'tanker', 'tractor'];
/** Габариты БТР для столкновений: ширина, длина (как HIT в traffic-cars.js) */
export const BTR_HIT = [1.0, 2.3];

const RUST = [0x5e, 0x3a, 0x20], SOOT = [0x1e, 0x1a, 0x18], ASH = [0x56, 0x52, 0x4c];
const rgb = function(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; };
const hex = function(c) { return (c[0] << 16) | (c[1] << 8) | c[2]; };

/**
 * Цвет детали после пожара: краска выцветает (серее и темнее) и уходит в ржавчину, сажу или пепел.
 * Стекло и фары — в сажу (разбиты). r — 0..1 (какой налёт), k — сила (0 — как было, 1 — сплошь налёт).
 */
export function burnHex(h, r, k) {
    const c = rgb(h), kk = k == null ? 0.55 : k;
    const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]);
    const glass = c[2] > c[0] + 12 && mx < 80; // тёмно-синее стекло
    const light = mn > 200 || (c[0] > 220 && c[1] < 60); // фары и стоп-сигналы
    if (glass || light) return hex(SOOT);
    const grey = (c[0] + c[1] + c[2]) / 3;
    const faded = c.map(function(v) { return (v * 0.3 + grey * 0.7) * 0.75; }); // краска выгорела
    const t = r < 0.4 ? RUST : r < 0.75 ? SOOT : ASH;
    return hex(faded.map(function(v, i) { return Math.round(v + (t[i] - v) * kk); }));
}

/**
 * Как лежит обломок: yaw — поворот поперёк хода (немного: держится в своей полосе), roll — на крыше (π) или на боку (±π/2),
 * smoke / fire — дымит и горит. Высокие (автобус, грузовик) на бок не ложатся — встали бы стеной.
 */
export function wreckPose(kind, r) {
    const tall = kind === 'bus' || kind === 'truck' || kind === 'btr' || !!WRECK_MODELS[kind]; // танк, самолёт, вертолёт… — не на бок
    const a = r();
    const roll = tall ? 0 : a < 0.3 ? Math.PI : a < 0.5 ? (r() < 0.5 ? 1 : -1) * Math.PI / 2 : 0; // автобус на крыше — просто коробка с колёсами, не читается
    const yaw = (r() - 0.5) * (roll ? 0.6 : 0.8);
    const s = r();
    return { yaw: yaw, roll: roll, smoke: s < 0.65, fire: s < 0.25, burn: 0.45 + r() * 0.3 };
}

let soot = null;
/** Пятна гари и ржавчины по граням (у коробок UV 0..1 на грань — у каждой грани свои подтёки) */
function sootTex() {
    return soot || (soot = tex(function(x) {
        x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 14; i++) { const px = (i * 41) % 64, py = (i * 23 + 7) % 64, rr = 6 + (i % 5) * 3; const g = x.createRadialGradient(px, py, 0, px, py, rr); const c = i % 3 ? '30,24,20' : '120,70,35'; g.addColorStop(0, 'rgba(' + c + ',0.75)'); g.addColorStop(1, 'rgba(' + c + ',0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
    }));
}
const burnt = {};
/** Перекрасить модель попутки после пожара и уложить по pose; материалы — общие по цвету (как в traffic-cars.js) */
export function dressWreck(group, pose, r) {
    group.traverse(function(o) {
        if (!o.isMesh || o.userData.keepSkin) return; // зверь на крыше — в своей шкуре
        const m = o.material, v = r() < 0.4 ? 0 : r() < 0.6 ? 1 : 2;
        const key = (m.color ? m.color.getHex() : 0) + ':' + v + ':' + Math.round(pose.burn * 4);
        if (!burnt[key]) burnt[key] = new THREE.MeshStandardMaterial({ color: burnHex(m.color ? m.color.getHex() : 0x444444, v / 2.5, pose.burn), map: sootTex(), roughness: 0.95, metalness: 0.05 });
        o.material = burnt[key];
    });
    group.rotation.set(0, pose.yaw, pose.roll);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);
    // после поворота — снова на асфальт и по центру полосы
    const b = new THREE.Box3().setFromObject(group), c = b.getCenter(new THREE.Vector3());
    group.position.set(-c.x, -b.min.y, 0);
    return group;
}

/** Ширина и длина для столкновений с учётом поворота (развёрнутый обломок шире) */
export function wreckHit(hitW, hitL, pose) {
    const cy = Math.abs(Math.cos(pose.yaw)), sy = Math.abs(Math.sin(pose.yaw));
    const w = pose.roll && Math.abs(pose.roll) < 3 ? hitW * 1.15 : hitW; // на боку — крыша торчит в сторону
    return [Math.min(1.9, w * cy + hitL * sy), hitL * cy + w * sy];
}

let puff = null, glow = null;
function tex(draw) {
    const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true; return t;
}
function puffTex() {
    return puff || (puff = tex(function(x) {
        for (let i = 0; i < 7; i++) { const px = 20 + (i * 37) % 24, py = 20 + (i * 53) % 24, rr = 12 + (i % 3) * 4; const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
    }));
}
function glowTex() {
    return glow || (glow = tex(function(x) { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
}
const smokeMats = [], fireMats = [];
function smokeMat(i) {
    if (!smokeMats[i]) { const v = 0.13 + i * 0.06; smokeMats[i] = new THREE.SpriteMaterial({ map: puffTex(), color: new THREE.Color().setRGB(v, v * 0.95, v * 0.9, THREE.SRGBColorSpace), transparent: true, opacity: 0.92 - i * 0.1, depthWrite: false, fog: false }); } // тёмный и без тумана — столб видно издалека на светлом небе
    return smokeMats[i];
}
let flameG = null; const flameMs = [];
function flameGeo() { if (!flameG) { flameG = new THREE.ConeGeometry(0.5, 1, 5); flameG.userData.keep = true; } return flameG; }
function flameMat(i) { return flameMs[i] || (flameMs[i] = new THREE.MeshBasicMaterial({ color: [0xff5a10, 0xff9a20, 0xffd040][i], transparent: true, opacity: 0.85 })); }
function fireMat(i) {
    // обычное смешивание и полупрозрачно: сложение трёх ореолов днём давало сплошной оранжевый диск, закрывавший обломок и зверей
    if (!fireMats[i]) fireMats[i] = new THREE.SpriteMaterial({ map: glowTex(), color: i ? 0xff7a1a : 0xffc040, transparent: true, opacity: 0.4, depthWrite: false });
    return fireMats[i];
}

/**
 * Дым столбом и огонь над обломком (спрайты — после слияния деталей, сливать их нельзя).
 * Дым относит назад и вбок; вершина — выше крыши автобуса: столб видно издалека, как маяк «впереди завал».
 */
export function wreckFx(root, pose, r) {
    const fx = new THREE.Group(); fx.name = 'wreckFx';
    if (pose.smoke) {
        const n = 6, drift = (r() - 0.5) * 0.8;
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1), s = new THREE.Sprite(smokeMat(Math.min(5, i)));
            const sz = 0.55 + t * 1.6; s.scale.set(sz, sz, 1);
            s.position.set(drift * t * t * 2, 0.7 + t * 3.4, t * t * 0.9);
            fx.add(s);
        }
    }
    if (pose.fire) { // огонь — объёмные языки пламени (видно днём, сквозь них видно и обломок) и один мягкий отсвет; flames: false — без языков (ролик аварии)
        if (pose.flames !== false) for (let i = 0; i < 5; i++) { const fl = new THREE.Mesh(flameGeo(), flameMat(i % 3)); const h = 0.35 + r() * 0.35; fl.scale.set(h * 0.4, h, h * 0.4); fl.position.set((r() - 0.5) * 0.6, 0.45 + h * 0.4, (r() - 0.5) * 0.7); fl.rotation.set((r() - 0.5) * 0.3, r() * 3, (r() - 0.5) * 0.3); fx.add(fl); }
        const gl = new THREE.Sprite(fireMat(0)); gl.scale.set(0.9, 0.9, 1); gl.position.set(0, 0.7, 0); fx.add(gl);
    }
    root.add(fx);
    return fx;
}

const btrMats = {};
function bm(h) { return btrMats[h] || (btrMats[h] = new THREE.MeshStandardMaterial({ color: h, roughness: 0.9, flatShading: true })); }
/**
 * Разбитый БТР: оливковый корпус в копоти, восемь колёс, башня со стволом. animal — модель зверя на крыше (или null).
 * Длина ~2.3 — как грузовик, занимает одну полосу.
 */
export function buildBtr(animal) {
    const g = new THREE.Group(), OL = bm(0x46502a), DK = bm(0x262a1c), TY = bm(0x161616);
    const add = function(geo, mat, x, y, z, rx, rz) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); m.castShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(0.95, 0.45, 2.25), OL, 0, 0.5, 0);
    add(new THREE.BoxGeometry(0.95, 0.3, 0.5), OL, 0, 0.42, -1.25, -0.6);
    add(new THREE.BoxGeometry(0.8, 0.15, 1.5), DK, 0, 0.8, 0.15);
    add(new THREE.CylinderGeometry(0.23, 0.27, 0.2, 8), DK, 0, 0.97, -0.15);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6), DK, 0, 1.06, -0.62, Math.PI / 2 - 0.25);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 10), TY, s * 0.5, 0.21, -0.8 + i * 0.54, 0, Math.PI / 2);
    if (animal) { animal.position.set(0, 0.88, 0.45); animal.rotation.y = Math.PI * 0.85; g.add(animal); }
    return g;
}

/** Зверь на крышу БТР: медведь, кабан или волк (собака) — «бешеный» вид (src/zombie-look.js) */
const ROOF = ['BEAR', 'BOAR', 'DOG'];
function roofAnimal(r) {
    const mk = typeof window !== 'undefined' && window.createAnimalMesh;
    if (!mk) return null;
    try { const sp = ROOF[Math.floor(r() * ROOF.length)], a = makeAnimal(sp); a.scale.multiplyScalar(0.62); a.traverse(function(o) { o.userData.keepSkin = true; }); return a; } catch (e) { return null; }
}

/**
 * Обломок для трассы целиком: модель (попутка или БТР), уложенная и перекрашенная, габариты для столкновений и поза
 * (по ней после слияния деталей — wreckFx). kind — из WRECK_KINDS, paint — исходный цвет кузова.
 */
export function makeWreck(kind, paint, r) {
    const pose = wreckPose(kind, r);
    let group, hw, hl;
    if (kind === 'btr') { group = buildBtr(roofAnimal(r)); hw = BTR_HIT[0]; hl = BTR_HIT[1]; pose.yaw *= 0.5; }
    else if (WRECK_MODELS[kind]) { const m = WRECK_MODELS[kind](r); group = m.group; hw = m.hitW; hl = m.hitL; pose.yaw *= 0.4; } // длинные — почти вдоль полосы
    else { const tb = buildTraffic(kind, paint); group = tb.group; hw = tb.hitW; hl = tb.hitL; }
    dressWreck(group, pose, r);
    const hit = wreckHit(hw, hl, pose);
    return { group: group, hitW: hit[0], hitL: hit[1], pose: pose };
}
