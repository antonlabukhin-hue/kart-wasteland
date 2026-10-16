/**
 * Пустошь: яркие акценты в каждом пейзаже — чтобы выжженный мир не сливался в одно бурое пятно.
 * У каждой зоны свой набор и свой цвет:
 *   Мёртвый Арсеньев — лавовые трещины по обочине, костры, тлеющие стены домов, красные огни на мачтах;
 *   Брошенная деревня — горящие стога, трещины, ядовитые лужи;
 *   Промзона — ядовито-зелёные озёра и бочки, мачты с мигалками, искрящие провода;
 *   Пепельная тайга — раскалённые трещины в пепле, горящие ели (костры), тлеющие стены;
 *   Пустой микрорайон — мигающий неон («БАР», «24», «АПТЕКА», «КИНО»), тлеющие стены, мачты, трещины;
 *   Ночь пожаров — большие костры, лавовые трещины, тлеющие стены, неон;
 *   Свалка «Надежда» — зелёные лужи вдоль обочины, светящиеся бочки, горящие шины;
 *   Кислотный дождь — кислотные лужи, бочки, неон;
 *   Сбежавший зоопарк — светящиеся грибы-мутанты, ядовитые озёра, красные огни сломанных вольеров.
 *
 * planAccents(theme, len, r) — что поставить на участке (чистая функция, тест); buildAccent(it, r) — модель;
 * flicker — мигание неона и огней (один объект на участок, двигает только прозрачность).
 */
import * as THREE from 'three';
import { wreckFx } from './wrecks.js';

export const ZONE_ACCENTS = {
    day: { kinds: ['fissure', 'bonfire', 'inferno', 'beacon', 'fissure', 'bonfire'], n: 10, ember: 0xff6a1a },
    village: { kinds: ['bonfire', 'fissure', 'toxicPool', 'inferno', 'bonfire'], n: 9, ember: 0xff7a2a },
    promzona: { kinds: ['toxicPool', 'barrels', 'toxicGlow', 'beacon', 'toxicPool', 'sparks'], n: 11, ember: 0x9aff3a },
    snow: { kinds: ['fissure', 'bonfire', 'inferno', 'fissure'], n: 9, ember: 0xff4a1a },
    city: { kinds: ['neon', 'fissure', 'neon', 'beacon', 'inferno', 'neon'], n: 10, ember: 0xff5a2a },
    night: { kinds: ['bonfire', 'fissure', 'inferno', 'neon', 'bonfire', 'fissure'], n: 11, ember: 0xff3a10 },
    svalka: { kinds: ['toxicPool', 'barrels', 'bonfire', 'toxicGlow', 'toxicPool'], n: 11, ember: 0x8aff3a },
    rain: { kinds: ['toxicPool', 'barrels', 'neon', 'toxicGlow', 'toxicPool'], n: 10, ember: 0x9aff5a },
    jungle: { kinds: ['mushrooms', 'toxicPool', 'beacon', 'mushrooms', 'toxicGlow'], n: 10, ember: 0xc04aff }
};
const FALLBACK = ZONE_ACCENTS.day;
/** Цвет тлеющих стен домов зоны (src/ruin.js) */
export function emberColor(themeId) { return (ZONE_ACCENTS[themeId] || FALLBACK).ember; }

/**
 * План участка длиной len (ед.): [{ kind, dz (от начала участка вглубь, 0..len), side −1|1, off — от края дороги }].
 * Лужи и трещины — у самой обочины (видно с дороги), костры и бочки — дальше, мачты и неон — у края застройки.
 */
export function planAccents(themeId, len, r) {
    const z = ZONE_ACCENTS[themeId] || FALLBACK, out = [];
    const near = { inferno: [28, 60], toxicGlow: [24, 50], fissure: [0.3, 1.1], toxicPool: [0.6, 3], sparks: [0.6, 1.4], barrels: [1.5, 5], bonfire: [3, 9], mushrooms: [2, 8], neon: [3, 6], beacon: [6, 14] };
    for (let i = 0; i < z.n; i++) {
        const kind = z.kinds[i % z.kinds.length], o = near[kind];
        out.push({ kind: kind, dz: (i + 0.2 + r() * 0.6) / z.n * len, side: r() < 0.5 ? -1 : 1, off: o[0] + r() * (o[1] - o[0]) });
    }
    return out;
}

/* ---------- модели ---------- */
const cache = {};
function canvasTex(key, w, h, draw) {
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true;
    return (cache[key] = t);
}
function glowTex() {
    return canvasTex('glow', 64, 64, function(x) { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
}
const sprMats = {};
function glow(color, size, op) {
    const k = color + ':' + (op || 1);
    if (!sprMats[k]) sprMats[k] = new THREE.SpriteMaterial({ map: glowTex(), color: color, transparent: true, opacity: op || 1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const s = new THREE.Sprite(sprMats[k]); s.scale.set(size, size, 1); return s;
}
const flatMats = {};
function flat(key, make) { return flatMats[key] || (flatMats[key] = make()); }
const geos = {};
function G(key, make) { if (!geos[key]) { geos[key] = make(); geos[key].userData.keep = true; } return geos[key]; }
function M(h, o) { const k = h + JSON.stringify(o || {}); return flatMats[k] || (flatMats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: h, roughness: 0.85, flatShading: true }, o || {}))); }
function mesh(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }

/** Раскалённая трещина: рваная светящаяся полоса на земле (вдоль дороги), над ней — жар */
function fissure(g, r) {
    const tex = canvasTex('fissure', 64, 512, function(x, w, h) {
        x.clearRect(0, 0, w, h);
        for (let pass = 0; pass < 2; pass++) {
            x.beginPath(); let px = w / 2;
            x.moveTo(px, 0);
            for (let y = 0; y <= h; y += 16) { px = w / 2 + Math.sin(y * 0.07) * 10 + ((y * 37) % 13 - 6); x.lineTo(px, y); }
            x.strokeStyle = pass ? 'rgba(255,230,140,1)' : 'rgba(255,90,20,0.9)'; x.lineWidth = pass ? 4 : 14; x.lineCap = 'round'; x.stroke();
        }
    });
    const mat = flat('fissureMat', function() { return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }); });
    const len = 5 + r() * 6, m = mesh(G('fissure', function() { return new THREE.PlaneGeometry(1.2, 1); }), mat, 0, 0.04, 0, g);
    m.scale.set(1, len, 1); m.rotation.x = -Math.PI / 2; m.rotation.z = (r() - 0.5) * 0.5;
    const char = mesh(G('char', function() { return new THREE.PlaneGeometry(2.2, 1); }), flat('charMat', function() { return new THREE.MeshBasicMaterial({ color: 0x0c0806, transparent: true, opacity: 0.55, depthWrite: false }); }), 0, 0.03, 0, g);
    char.scale.set(1, len, 1); char.rotation.copy(m.rotation);
    for (let i = 0; i < 4; i++) { const s = glow(0xff5a1a, 1 + r() * 0.6, 0.45); s.position.set((r() - 0.5) * 0.6, 0.35, (i - 1) * len * 0.3); g.add(s); }
}
/** Ядовитая лужа: ярко-зелёная, светится, пузыри */
function toxicPool(g, r) {
    const tex = canvasTex('pool', 128, 128, function(x) { const gr = x.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(200,255,90,1)'); gr.addColorStop(0.55, 'rgba(90,230,40,0.95)'); gr.addColorStop(0.85, 'rgba(40,120,20,0.8)'); gr.addColorStop(1, 'rgba(20,60,10,0)'); x.fillStyle = gr; x.beginPath(); for (let a = 0; a < Math.PI * 2; a += 0.3) { const rr = 52 + Math.sin(a * 5) * 8; x.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } x.fill(); });
    const mat = flat('poolMat', function() { return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }); });
    const s = 1.6 + r() * 2.4, m = mesh(G('pool', function() { return new THREE.PlaneGeometry(1, 1); }), mat, 0, 0.045, 0, g);
    m.scale.set(s, s * (0.7 + r() * 0.5), 1); m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 3;
    const gl = glow(0x7aff3a, s * 2, 0.6); gl.position.y = 0.4; g.add(gl);
    for (let i = 0; i < 4; i++) { const b = mesh(G('bubble', function() { return new THREE.SphereGeometry(0.07, 8, 6); }), flat('bubbleMat', function() { return new THREE.MeshBasicMaterial({ color: 0xd8ff8a }); }), (r() - 0.5) * s * 0.6, 0.06, (r() - 0.5) * s * 0.4, g); b.scale.setScalar(0.6 + r()); }
}
/** Бочки с радиоактивным светом: ржавые, крышки светятся зелёным */
function barrels(g, r) {
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
        const x = (r() - 0.5) * 1.6, z = (r() - 0.5) * 1.6, lie = r() < 0.3;
        const b = mesh(G('barrel', function() { return new THREE.CylinderGeometry(0.3, 0.3, 0.85, 10); }), M(i % 2 ? 0x6a5a2a : 0x3a5a2a), x, lie ? 0.3 : 0.43, z, g);
        if (lie) { b.rotation.z = Math.PI / 2; b.rotation.y = r() * 3; }
        else { const top = mesh(G('barrelTop', function() { return new THREE.CircleGeometry(0.27, 10); }), flat('barrelTopMat', function() { return new THREE.MeshBasicMaterial({ color: 0x9aff3a }); }), x, 0.865, z, g); top.rotation.x = -Math.PI / 2; }
        b.castShadow = true;
    }
    const gl = glow(0x8aff3a, 3, 0.5); gl.position.y = 1; g.add(gl);
    const p = new THREE.Group(); toxicPool(p, r); p.scale.setScalar(0.6); p.position.set(0.6, 0, 0.8); g.add(p);
}
/** Костёр / горящий стог: огонь и высокий дым */
function bonfire(g, r) {
    const hay = mesh(G('hay', function() { return new THREE.CylinderGeometry(0.7, 0.9, 0.9, 9); }), M(0x3a2a18), 0, 0.45, 0, g); hay.castShadow = true;
    const f = new THREE.Group(); f.scale.setScalar(2.2); f.position.y = 0.4; g.add(f);
    wreckFx(f, { smoke: true, fire: true }, r);
    const gl = glow(0xff6a1a, 7, 0.7); gl.position.y = 1.4; g.add(gl);
}
/** Мачта с красными огнями — видно издалека, огни мигают */
function beacon(g, r, blink) {
    const h = 7 + r() * 6;
    const pole = mesh(G('mast', function() { return new THREE.CylinderGeometry(0.06, 0.12, 1, 6); }), M(0x3a3a3a), 0, h / 2, 0, g); pole.scale.y = h;
    for (let k = 1; k <= 3; k++) {
        const y = h * k / 3, lamp = mesh(G('lamp', function() { return new THREE.SphereGeometry(0.12, 8, 6); }), flat('lampMat', function() { return new THREE.MeshBasicMaterial({ color: 0xff2a1a }); }), 0, y, 0, g);
        const gl = glow(0xff2a1a, 1.6, 0.9); gl.position.y = y; g.add(gl); gl.material = gl.material.clone(); blink.push({ o: gl, ph: k * 0.7 + r() * 3, kind: 'blink' });
        lamp.castShadow = false;
    }
    for (let k = 0; k < 4; k++) { const s = mesh(G('strut', function() { return new THREE.BoxGeometry(0.04, 1, 0.04); }), M(0x3a3a3a), 0, h * 0.25, 0, g); s.scale.y = h * 0.55; s.rotation.z = (k % 2 ? 1 : -1) * 0.12; s.rotation.y = k * Math.PI / 2; }
}
const NEON = [['БАР', '#ff3ad8'], ['24', '#3ae8ff'], ['АПТЕКА', '#3aff6a'], ['КИНО', '#ffd23a'], ['ОТЕЛЬ', '#ff4a3a'], ['ВИДЕО', '#b04aff']];
/** Неоновая вывеска на столбе — мигает, одна буква «барахлит» */
function neon(g, r, blink) {
    const [txt, col] = NEON[Math.floor(r() * NEON.length)];
    const tex = canvasTex('neon:' + txt, 256, 96, function(x, w, h) { x.fillStyle = '#120a14'; x.fillRect(0, 0, w, h); x.font = 'bold 64px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 18; x.fillStyle = col; x.fillText(txt, w / 2, h / 2 + 4); x.shadowBlur = 0; x.fillStyle = '#fff'; x.globalAlpha = 0.65; x.fillText(txt, w / 2, h / 2 + 4); });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false });
    const h = 3.2 + r() * 1.5;
    mesh(G('npole', function() { return new THREE.BoxGeometry(0.1, 1, 0.1); }), M(0x2a2a2a), 0, h / 2, 0, g).scale.y = h;
    const sign = mesh(G('nsign', function() { return new THREE.PlaneGeometry(2.4, 0.9); }), mat, 0, h + 0.3, 0, g);
    sign.userData.faceRoad = true;
    const gl = glow(new THREE.Color(col).getHex(), 3.2, 0.5); gl.position.y = h + 0.3; g.add(gl);
    gl.material = gl.material.clone(); blink.push({ o: gl, mat: mat, ph: r() * 6, kind: 'neon' });
}
/** Светящиеся грибы-мутанты */
function mushrooms(g, r) {
    const cols = [0xc04aff, 0x3affd8, 0xff4ab8];
    const n = 4 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
        const s = 0.5 + r() * 1.8, x = (r() - 0.5) * 3, z = (r() - 0.5) * 3, c = cols[i % cols.length];
        mesh(G('stem', function() { return new THREE.CylinderGeometry(0.08, 0.12, 1, 7); }), M(0xd8d0c0), x, s * 0.5, z, g).scale.set(s, s, s);
        const cap = mesh(G('cap', function() { return new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); }), flat('cap' + c, function() { return new THREE.MeshBasicMaterial({ color: c }); }), x, s, z, g); cap.scale.setScalar(s);
        const gl = glow(c, s * 1.8, 0.45); gl.position.set(x, s, z); g.add(gl);
    }
}
/** Искрящий оборванный провод: столб и сноп искр у земли */
function sparks(g, r, blink) {
    mesh(G('wpole', function() { return new THREE.CylinderGeometry(0.08, 0.1, 4, 6); }), M(0x4a3a2a), 0, 2, 0, g);
    const wire = mesh(G('wire', function() { return new THREE.CylinderGeometry(0.015, 0.015, 3, 4); }), M(0x111111), 0.5, 2.2, 0, g); wire.rotation.z = 0.5;
    for (let i = 0; i < 6; i++) { const s = glow(0xfff0a0, 0.25 + r() * 0.3, 1); s.position.set(1.2 + (r() - 0.5) * 0.5, 0.2 + r() * 0.6, (r() - 0.5) * 0.5); s.material = s.material.clone(); g.add(s); blink.push({ o: s, ph: r() * 6, kind: 'spark' }); }
    const gl = glow(0xfff0a0, 1.6, 0.7); gl.position.set(1.2, 0.3, 0); gl.material = gl.material.clone(); g.add(gl); blink.push({ o: gl, ph: 0, kind: 'spark' });
}

/** Пожар на горизонте: огромное зарево, языки огня и столб дыма до неба — видно за полкилометра */
function inferno(g, r) {
    const f = new THREE.Group(); f.scale.setScalar(7 + r() * 4); g.add(f);
    wreckFx(f, { smoke: true, fire: true }, r);
    const a = glow(0xff4a10, 26 + r() * 10, 0.6); a.position.y = 4; g.add(a);
    const b = glow(0xffb040, 10, 0.8); b.position.y = 2; g.add(b);
}
/** Ядовитое зарево: зелёный свет над озером отходов вдалеке */
function toxicGlow(g, r) {
    const p = new THREE.Group(); toxicPool(p, r); p.scale.setScalar(4); g.add(p);
    const a = glow(0x6aff2a, 22 + r() * 8, 0.5); a.position.y = 3; g.add(a);
}

/** Модель акцента; blink — список мигающего (для flicker) */
export function buildAccent(it, r, blink) {
    const g = new THREE.Group(); g.name = 'accent:' + it.kind;
    const b = blink || [];
    if (it.kind === 'fissure') fissure(g, r);
    else if (it.kind === 'toxicPool') toxicPool(g, r);
    else if (it.kind === 'barrels') barrels(g, r);
    else if (it.kind === 'bonfire') bonfire(g, r);
    else if (it.kind === 'beacon') beacon(g, r, b);
    else if (it.kind === 'neon') neon(g, r, b);
    else if (it.kind === 'mushrooms') mushrooms(g, r);
    else if (it.kind === 'sparks') sparks(g, r, b);
    else if (it.kind === 'inferno') inferno(g, r);
    else if (it.kind === 'toxicGlow') toxicGlow(g, r);
    return g;
}

/** Яркость мигающего в момент t (с): мачты — вспышка раз в 1.2 с, неон — горит, иногда «барахлит», искры — трещат */
export function blinkLevel(kind, t, ph) {
    if (kind === 'blink') return ((t + ph) % 1.2) < 0.5 ? 1 : 0.15;
    if (kind === 'neon') { const q = (t * 0.7 + ph) % 7; return q > 6.2 && Math.sin(t * 40) > 0 ? 0.15 : 1; }
    return Math.max(0, Math.sin(t * 23 + ph * 7) * Math.sin(t * 9.3 + ph));
}

/**
 * Акценты на участке g (обочина inf-world): themeId, z0 — начало участка, len — длина, W — ширина дороги.
 * Возвращает мигалку { update(z, now), dispose() } (или null — мигать нечему).
 */
export function accentStretch(g, themeId, z0, len, W, r, heightAt, lite) {
    const blink = [];
    planAccents(themeId, len, r).forEach(function(it, i) {
        if (lite && i % 2) return; // слабый телефон — половина
        const a = buildAccent(it, r, blink), x = it.side * (W / 2 + it.off), z = z0 - it.dz;
        a.position.set(x, heightAt ? heightAt(x, z) : 0, z);
        if (it.kind === 'neon') a.rotation.y = -it.side * Math.PI / 2 * 0.8; // вывеска — лицом к дороге
        g.add(a);
    });
    if (!blink.length) return null;
    return {
        update: function(z, now) {
            const t = (now || 0) / 1000;
            for (let i = 0; i < blink.length; i++) { const b = blink[i], v = blinkLevel(b.kind, t, b.ph); b.o.visible = v > 0.05; b.o.material.opacity = v * (b.kind === 'neon' ? 0.5 : 0.9); if (b.mat) b.mat.opacity = 0.35 + v * 0.65; }
        },
        dispose: function() { blink.length = 0; }
    };
}
