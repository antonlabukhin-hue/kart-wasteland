/**
 * Пустошь: пейзаж после катастрофы. Каждый участок обочины (src/inf-world.js) после постройки «разрушается»:
 * дома, остановки, ларьки — выцветшие, в копоти и ржавых подтёках пятнами, стёкла выбиты (тёмные), листва — мёртвая,
 * у части домов и деревьев — огонь и столб дыма, у стен — завалы из обломков.
 *
 * ruinRgb — цвет после катастрофы (чистая функция, тест), ruinStretch(g, r) — разрушить участок (до freezeStatic).
 * Геометрия и материалы общие у многих участков — перекрашиваются один раз (кэш), вершинные цвета — у своей геометрии.
 */
import * as THREE from 'three';
import { wreckFx } from './wrecks.js';

const SOOT = [30, 26, 22], RUST = [112, 62, 30], DEAD = [72, 54, 36], ASH = [92, 88, 82];
const mix = function(c, t, k) { return c.map(function(v, i) { return Math.round(v + (t[i] - v) * k); }); };

/**
 * Цвет (0..255) после катастрофы. n — «пятно» 0..1 (шум по месту), y — высота над землёй.
 * Листва — мёртвая (бурая, пепельная), стекло — выбито (тёмное), остальное — выцветшее, местами в копоти и ржавчине;
 * выше 2.2 ед. (крыши, верхние этажи) копоти больше — горело сверху.
 */
export function ruinRgb(r, g, b, n, y) {
    const c = [r, g, b], lum = (r + g + b) / 3;
    if (g > r * 1.08 && g > b * 1.08) return mix(mix(c, n < 0.5 ? DEAD : ASH, 0.75), SOOT, n > 0.8 ? 0.6 : 0.15); // листва и трава
    if (b > r + 18 && b > g && lum > 95) return mix(SOOT, c, 0.12); // стекло — выбито
    let d = c.map(function(v) { return (v * 0.4 + lum * 0.6) * 0.8; });
    if (n > 0.62 || (y || 0) > 2.2 && n > 0.35) d = mix(d, SOOT, 0.55);
    else if (n < 0.18) d = mix(d, RUST, 0.38);
    return d.map(function(v) { return Math.max(0, Math.min(255, Math.round(v))); });
}

/** Шум 0..1 по точке — пятна копоти крупные (не по вершинам вразнобой) */
export function blot(x, y, z) {
    const s = Math.sin(Math.floor(x * 0.7) * 12.9898 + Math.floor(y * 0.9) * 4.1414 + Math.floor(z * 0.7) * 78.233) * 43758.5453;
    return s - Math.floor(s);
}

const mats = new Map(), maps = new Map();
function ruinMap(t) {
    if (maps.has(t)) return maps.get(t);
    let out = t;
    try {
        const im = t.image, w = im.width || 64, h = im.height || 64;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const q = ruinRgb(p[i], p[i + 1], p[i + 2], ((i >> 2) % 97) / 97 * 0.6 + 0.2, 0); p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2]; }
        x.putImageData(d, 0, 0);
        out = new THREE.CanvasTexture(c);
        ['colorSpace', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'flipY', 'generateMipmaps'].forEach(function(k) { out[k] = t[k]; });
        out.repeat.copy(t.repeat); out.offset.copy(t.offset); out.userData.keep = true;
    } catch (e) { out = t; }
    maps.set(t, out);
    return out;
}
function ruinMat(m) {
    if (!m || m.userData.ruined) return m;
    if (mats.has(m)) return mats.get(m);
    const c = m.clone(); c.userData.ruined = true;
    if (c.map) c.map = ruinMap(c.map);
    if (c.color && !c.vertexColors) { const q = ruinRgb(c.color.r * 255, c.color.g * 255, c.color.b * 255, blot(m.id, 0, 3), 0); c.color.setRGB(q[0] / 255, q[1] / 255, q[2] / 255); }
    if (c.emissive && !(c.emissiveIntensity > 0.5)) c.emissive.setHex(0);
    mats.set(m, c);
    return c;
}
function ruinVertexColors(o) {
    const geo = o.geometry, col = geo && geo.attributes.color;
    if (!col || geo.userData.ruined) return;
    geo.userData.ruined = true;
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < col.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const q = ruinRgb(col.getX(i) * 255, col.getY(i) * 255, col.getZ(i) * 255, blot(v.x, v.y, v.z), v.y);
        col.setXYZ(i, q[0] / 255, q[1] / 255, q[2] / 255);
    }
    col.needsUpdate = true;
}

const RUBBLE = [0x5a524a, 0x6e6458, 0x3a3430, 0x7a5a3a];
let rubbleGeo = null;
/** Завал у стены: несколько обломков-глыб */
function rubble(g, x, z, r) {
    if (!rubbleGeo) { rubbleGeo = new THREE.DodecahedronGeometry(0.28, 0); rubbleGeo.userData.keep = true; }
    for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(rubbleGeo, mat(RUBBLE[i % RUBBLE.length]));
        m.position.set(x + (r() - 0.5) * 1.6, 0.12, z + (r() - 0.5) * 1.6); m.rotation.set(r() * 3, r() * 3, 0); m.scale.setScalar(0.6 + r() * 0.9);
        m.castShadow = true; g.add(m);
    }
}
const embersM = {};
let emberTex = null;
function emberMat(c) {
    if (!emberTex) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
        const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
        x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 3; x.beginPath(); x.moveTo(32, 4); x.lineTo(26, 22); x.lineTo(36, 34); x.lineTo(28, 50); x.lineTo(34, 62); x.stroke(); // трещина
        emberTex = new THREE.CanvasTexture(cv); emberTex.userData.keep = true;
    }
    return embersM[c] || (embersM[c] = new THREE.SpriteMaterial({ map: emberTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
}
const plain = {};
function mat(h) { return plain[h] || (plain[h] = new THREE.MeshStandardMaterial({ color: h, roughness: 1, flatShading: true })); }

/**
 * Разрушить участок g (группа обочины, ещё не замороженная). r — генератор [0,1).
 * Возвращает { fires } — сколько очагов огня поставлено (для теста и замеров).
 */
export function ruinStretch(g, r, o) {
    const opts = o || {};
    g.updateMatrixWorld(true);
    const houses = [], trees = [], v = new THREE.Vector3(), mtx = new THREE.Matrix4();
    g.traverse(function(m) {
        if (!m.isMesh) return;
        m.material = Array.isArray(m.material) ? m.material.map(ruinMat) : ruinMat(m.material);
        ruinVertexColors(m);
        if (m.isInstancedMesh) { // деревья: кроны — кандидаты в очаги
            for (let i = 0; i < m.count && trees.length < 40; i += 2) { m.getMatrixAt(i, mtx); v.setFromMatrixPosition(mtx).applyMatrix4(m.matrixWorld); trees.push(v.clone()); }
        } else if (m.geometry.attributes.position.count > 150) { // крупный меш (дома одним мешем): точки повыше — очаги
            const pos = m.geometry.attributes.position;
            for (let k = 0; k < 12; k++) { v.fromBufferAttribute(pos, Math.floor(r() * pos.count)).applyMatrix4(m.matrixWorld); if (v.y > 1.2 && Math.abs(v.x) > 4.5) houses.push(v.clone()); }
        }
    });
    let fires = 0;
    const lit = function(p, scale, fire) {
        const f = new THREE.Group(); f.position.copy(p); f.scale.setScalar(scale); g.add(f);
        wreckFx(f, { smoke: true, fire: fire }, r); fires++;
    };
    const nh = opts.houseFires == null ? 2 : opts.houseFires, nt = opts.treeFires == null ? 2 : opts.treeFires;
    for (let i = 0; i < nh && houses.length; i++) { const p = houses.splice(Math.floor(r() * houses.length), 1)[0]; lit(p, 1.3, r() < 0.7); rubble(g, p.x * 0.92, p.z, r); }
    for (let i = 0; i < nt && trees.length; i++) { const p = trees.splice(Math.floor(r() * trees.length), 1)[0]; p.y += 1.4; lit(p, 0.9, true); }
    // тлеющие трещины и окна в стенах: светящиеся пятна цвета зоны (src/zone-accents.js emberColor)
    let embers = 0;
    if (opts.ember != null) for (let i = 0; i < (opts.embers == null ? 8 : opts.embers) && houses.length; i++) {
        const p = houses.splice(Math.floor(r() * houses.length), 1)[0];
        const s = new THREE.Sprite(emberMat(opts.ember)); s.scale.setScalar(0.5 + r() * 0.9); s.position.copy(p); g.add(s); embers++;
    }
    return { fires: fires, embers: embers };
}
