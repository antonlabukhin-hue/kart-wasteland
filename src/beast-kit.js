/**
 * Пустошь: у каждого зверя — своё лицо. Не один болотный оттенок на всех, а свой окрас и своя мутация,
 * по которой его узнаёшь издалека и сразу понимаешь, что он сделает:
 *   Волк-падальщик (DOG) — пепельный, костяной гребень, шипастый ошейник, красные глаза;
 *   Огнелис (FOX) — огненно-рыжий, хвост горит;
 *   Чумной кот (CAT) — чёрный, ядовито-зелёные пятна и глаза, шипы по спине;
 *   Кабан-таран (BOAR) — тёмный, раскалённые клыки, стальная пластина на лбу, гребень;
 *   Олень-призрак (DEER) — пепельно-белый, светящиеся бирюзовые рога;
 *   Медведь-мутант (BEAR) — бурый в шрамах, радиоактивные пятна, костяные шипы;
 *   Лев-пожар (LION) — грива пылает; Носорог-бульдозер (RHINO) — ржавая броня, раскалённый рог;
 *   Мамонт пустоши (ELEPHANT) — тёмный, светящиеся бивни; Бегемот-болотник (HIPPO) — с него капает слизь;
 *   Крокодил-кислотник (CROC) — светящийся гребень; Обезьяна-мародёр (MONKEY) — в очках-консервах;
 *   Зебра-призрак (ZEBRA) — красные светящиеся полосы; Жираф (GIRAFFE) — фиолетовые светящиеся пятна; Ящер (DINO) — жёлтый гребень.
 *
 * BEASTS — окрас и мутации (данные, тест); dressBeast(mesh, species) — перекрасить и навесить мутации.
 * Модель зверя смотрит в +z, стоит на y = 0 (main.js createAnimalMesh); места для деталей — по габаритам и глазам.
 */
import * as THREE from 'three';

export const BEASTS = {
    DOG: { name: 'Волк-падальщик', tint: 0x6a6460, eye: 0xff2a1a, f: [['spikes', 0xe8dcc0, 6], ['collar', 0x2a2a2a]] },
    FOX: { name: 'Огнелис', tint: 0xff6a20, eye: 0xffd040, f: [['tailFire', 0xff7a1a]] },
    CAT: { name: 'Чумной кот', tint: 0x2a2a30, eye: 0x7aff2a, f: [['patches', 0x7aff2a, 4], ['spikes', 0x9aa080, 4]] },
    BOAR: { name: 'Кабан-таран', tint: 0x4a3020, eye: 0xff4a1a, f: [['tusks', 0xff8a2a], ['plate', 0x8a8e92], ['spikes', 0x2a1a10, 5]] },
    DEER: { name: 'Олень-призрак', tint: 0xd8d4cc, eye: 0x3affe0, f: [['antlers', 0x3affe0]] },
    BEAR: { name: 'Медведь-мутант', tint: 0x5a3018, eye: 0xff2a1a, f: [['patches', 0x9aff3a, 5], ['spikes', 0xe8dcc0, 5]] },
    LION: { name: 'Лев-пожар', tint: 0xc8862a, eye: 0xffd040, f: [['mane', 0xff5a10]] },
    RHINO: { name: 'Носорог-бульдозер', tint: 0x7a5a48, eye: 0xff3a1a, f: [['horn', 0xff5a1a], ['plate', 0x8a5a3a], ['spikes', 0x5a3a2a, 4]] },
    ELEPHANT: { name: 'Мамонт пустоши', tint: 0x4a4038, eye: 0xff3a1a, f: [['tusks', 0xfff0c0], ['spikes', 0x3a3028, 6]] },
    HIPPO: { name: 'Бегемот-болотник', tint: 0x5a4a70, eye: 0xff2a8a, f: [['slime', 0x8aff3a], ['patches', 0x8aff3a, 3]] },
    CROC: { name: 'Крокодил-кислотник', tint: 0x2a4a2a, eye: 0xffe03a, f: [['spikes', 0x9aff3a, 8, true]] },
    MONKEY: { name: 'Обезьяна-мародёр', tint: 0x8a5a3a, eye: 0xff2a1a, f: [['goggles', 0x3a3a3a]] },
    ZEBRA: { name: 'Зебра-призрак', tint: 0xe8e4dc, eye: 0xff2a1a, f: [['patches', 0xff2a1a, 5]] },
    GIRAFFE: { name: 'Жираф-мутант', tint: 0xc89050, eye: 0xc04aff, f: [['patches', 0xc04aff, 5]] },
    DINO: { name: 'Ящер', tint: 0x3a6a2a, eye: 0xffd03a, f: [['spikes', 0xffd03a, 7, true]] }
};

/* ---------- материалы и спрайты ---------- */
let glowT = null;
function glowTex() {
    if (glowT) return glowT;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    glowT = new THREE.CanvasTexture(c); glowT.userData.keep = true; return glowT;
}
const sm = {}, bm = {}, lm = {};
/** Ореол: небольшой и полупрозрачный — подсвечивает деталь, но не закрывает зверя (сложение ореолов днём давало сплошной цветной шар) */
export const GLOW_MAX = 0.18, GLOW_OPACITY = 0.45;
function glow(color, size) { const m = sm[color] || (sm[color] = new THREE.SpriteMaterial({ map: glowTex(), color: color, transparent: true, opacity: GLOW_OPACITY, depthWrite: false, fog: false })); const s = new THREE.Sprite(m); s.scale.setScalar(Math.min(GLOW_MAX, size)); return s; }
/** Язык пламени: светящийся конус (виден днём, не прячет зверя) */
function flame(add, color, x, y, z, h, tilt) { const c = add(new THREE.Mesh(G('flame', function() { return new THREE.ConeGeometry(0.5, 1, 5); }), lit(color))); c.scale.set(h * 0.35, h, h * 0.35); c.position.set(x, y + h * 0.4, z); c.rotation.set(tilt || 0, 0, 0); return c; }
function lit(color) { return bm[color] || (bm[color] = new THREE.MeshBasicMaterial({ color: color })); }
function solid(color) { return lm[color] || (lm[color] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.3, flatShading: true })); }
const geos = {};
function G(k, make) { if (!geos[k]) { geos[k] = make(); geos[k].userData.keep = true; } return geos[k]; }

/** Окраска: текстура и цвет уводятся к окрасу вида, чуть темнее — пустошь */
const tinted = new Map();
function tintMat(m, tint) {
    const key = m.uuid + ':' + tint;
    if (tinted.has(key)) return tinted.get(key);
    const c = m.clone(), t = new THREE.Color(tint);
    if (c.color) { if (c.map) c.color.copy(t).multiplyScalar(1.15); else c.color.lerp(t, 0.7).multiplyScalar(0.92); }
    tinted.set(key, c);
    return c;
}

/** Верх зверя над точкой (x, z): луч сверху по его деталям */
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
function topAt(mesh, parts, x, z) {
    ray.set(new THREE.Vector3(x, 10, z), down);
    const hit = ray.intersectObjects(parts, false)[0];
    return hit ? hit.point.y : null;
}

/** Навесить мутации; голова — по глазам */
function addFeatures(mesh, def, eyes) {
    mesh.updateMatrixWorld(true);
    const parts = []; mesh.traverse(function(o) { if (o.isMesh && !(o.userData && (o.userData.isEye || o.userData.isLeg || o.userData.isPaw))) parts.push(o); });
    const box = new THREE.Box3(); parts.forEach(function(p) { box.union(new THREE.Box3().setFromObject(p)); });
    const head = new THREE.Vector3();
    if (eyes.length) { eyes.forEach(function(e) { head.add(e.getWorldPosition(new THREE.Vector3())); }); head.divideScalar(eyes.length); }
    else head.set(0, box.max.y * 0.8, box.max.z * 0.7);
    const size = Math.max(box.max.y, box.max.z - box.min.z) || 1;
    const fx = new THREE.Group(); fx.name = 'beastFx'; mesh.add(fx);
    const add = function(o) { fx.add(o); return o; };
    def.f.forEach(function(ft) {
        const kind = ft[0], col = ft[1], n = ft[2] || 4;
        if (kind === 'spikes') { // гребень по спине: от загривка к хвосту
            const z0 = ft[3] ? head.z - 0.05 : head.z - size * 0.28, z1 = box.min.z + size * 0.12;
            for (let i = 0; i < n; i++) {
                const z = z0 + (z1 - z0) * (i / Math.max(1, n - 1)), y = topAt(mesh, parts, 0, z);
                if (y == null) continue;
                const h = size * (0.13 - 0.05 * Math.abs(i / n - 0.4));
                const s = add(new THREE.Mesh(G('spike', function() { return new THREE.ConeGeometry(0.5, 1, 5); }), ft[3] ? lit(col) : solid(col)));
                s.scale.set(h * 0.45, h, h * 0.45); s.position.set(0, y + h * 0.4, z); s.rotation.x = -0.35;
                if (ft[3]) { const g = glow(col, h * 2.2); g.position.copy(s.position); add(g); }
            }
        } else if (kind === 'tusks' || kind === 'horn') {
            const sides = kind === 'horn' ? [0] : [-1, 1];
            sides.forEach(function(sd) {
                const t = add(new THREE.Mesh(G('tusk', function() { return new THREE.ConeGeometry(0.5, 1, 6); }), lit(col)));
                const L = size * (kind === 'horn' ? 0.26 : 0.2);
                t.scale.set(L * 0.22, L, L * 0.22);
                t.position.set(head.x + sd * size * 0.09, head.y - size * (kind === 'horn' ? 0.02 : 0.12), head.z + size * 0.14);
                t.rotation.x = kind === 'horn' ? 0.6 : 1.1; t.rotation.z = -sd * 0.3;
                const g = glow(col, L * 1.6); g.position.copy(t.position); add(g);
            });
        } else if (kind === 'antlers') {
            [-1, 1].forEach(function(sd) {
                for (let k = 0; k < 3; k++) {
                    const b = add(new THREE.Mesh(G('antler', function() { return new THREE.CylinderGeometry(0.02, 0.03, 1, 5); }), lit(col)));
                    const L = size * (0.32 - k * 0.07);
                    b.scale.y = L; b.position.set(head.x + sd * (size * 0.06 + k * size * 0.05), head.y + size * 0.12 + k * size * 0.1, head.z - size * 0.02);
                    b.rotation.z = -sd * (0.5 + k * 0.35);
                }
                const g = glow(col, size * 0.6); g.position.set(head.x + sd * size * 0.15, head.y + size * 0.3, head.z); add(g);
            });
        } else if (kind === 'tailFire') {
            const p = new THREE.Vector3(0, (topAt(mesh, parts, 0, box.min.z + size * 0.05) || box.max.y * 0.6), box.min.z);
            for (let i = 0; i < 4; i++) flame(add, i % 2 ? col : 0xffd040, p.x + (i - 1.5) * size * 0.04, p.y, p.z - (i % 2) * size * 0.05, size * (0.22 - i * 0.03), -0.4);
        } else if (kind === 'mane') {
            for (let i = 0; i < 9; i++) { const ang = i / 9 * Math.PI * 2, fl = flame(add, i % 2 ? col : 0xffb040, head.x + Math.cos(ang) * size * 0.17, head.y + Math.sin(ang) * size * 0.17, head.z - size * 0.1, size * 0.16, 0); fl.position.y -= size * 0.06; fl.rotation.z = ang - Math.PI / 2; }
        } else if (kind === 'patches') {
            for (let i = 0; i < n; i++) {
                const z = box.min.z + (box.max.z - box.min.z) * (0.2 + 0.6 * (i / Math.max(1, n - 1))), sd = i % 2 ? 1 : -1;
                const y = topAt(mesh, parts, 0, z); if (y == null) continue;
                const pt = add(new THREE.Mesh(G('blot', function() { return new THREE.SphereGeometry(0.5, 7, 5); }), lit(col))); pt.scale.set(size * 0.05, size * 0.09, size * 0.11); pt.position.set(sd * size * 0.16, y - size * 0.1, z);
            }
        } else if (kind === 'plate') {
            const p = add(new THREE.Mesh(G('plate', function() { return new THREE.BoxGeometry(1, 0.25, 0.7); }), solid(col)));
            p.scale.setScalar(size * 0.3); p.position.set(head.x, head.y + size * 0.08, head.z + size * 0.02); p.rotation.x = -0.3;
            for (let k = -1; k <= 1; k += 2) { const r = add(new THREE.Mesh(G('rivet', function() { return new THREE.SphereGeometry(0.5, 6, 4); }), solid(0xcfd3d6))); r.scale.setScalar(size * 0.03); r.position.set(head.x + k * size * 0.1, head.y + size * 0.13, head.z + size * 0.04); }
        } else if (kind === 'collar') {
            const c = add(new THREE.Mesh(G('collar', function() { return new THREE.TorusGeometry(0.5, 0.12, 6, 12); }), solid(col)));
            c.scale.setScalar(size * 0.2); c.position.set(head.x, head.y - size * 0.12, head.z - size * 0.15);
            for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2, s = add(new THREE.Mesh(G('cspike', function() { return new THREE.ConeGeometry(0.5, 1, 4); }), solid(0xcfd3d6))); s.scale.set(size * 0.025, size * 0.06, size * 0.025); s.position.set(c.position.x + Math.cos(ang) * size * 0.11, c.position.y + Math.sin(ang) * size * 0.11, c.position.z); s.rotation.z = ang - Math.PI / 2; }
        } else if (kind === 'slime') {
            for (let i = 0; i < 4; i++) { const d = add(new THREE.Mesh(G('drip', function() { return new THREE.SphereGeometry(0.5, 6, 5); }), lit(col))); d.scale.set(size * 0.03, size * 0.07, size * 0.03); d.position.set(head.x + (i - 1.5) * size * 0.06, head.y - size * 0.2 - (i % 2) * size * 0.05, head.z + size * 0.12); }
            const g = glow(col, size * 0.45); g.position.set(head.x, head.y - size * 0.2, head.z + size * 0.1); add(g);
        } else if (kind === 'goggles') {
            [-1, 1].forEach(function(sd) { const gg = add(new THREE.Mesh(G('goggle', function() { return new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10); }), solid(col))); gg.scale.setScalar(size * 0.09); gg.rotation.x = Math.PI / 2; gg.position.set(head.x + sd * size * 0.07, head.y + size * 0.01, head.z + size * 0.04); });
            const strap = add(new THREE.Mesh(G('strap', function() { return new THREE.BoxGeometry(1, 0.15, 0.6); }), solid(0x2a1a10))); strap.scale.setScalar(size * 0.32); strap.position.set(head.x, head.y + size * 0.01, head.z - size * 0.05);
        }
    });
    // глаза горят цветом вида
    eyes.forEach(function(e) { const g = glow(def.eye, size * 0.16); e.getWorldPosition(g.position); fx.worldToLocal(g.position); add(g); });
    return fx;
}

/** Перекрасить зверя в окрас вида и навесить мутации; повторно — ничего. false — вида нет в BEASTS */
export function dressBeast(mesh, species) {
    const def = BEASTS[species];
    if (!def || !mesh || mesh.userData.beast) return !!(mesh && mesh.userData.beast);
    mesh.userData.beast = species; mesh.userData.zombie = true;
    const eyes = [], eyeMat = lit(def.eye);
    const own = !!mesh.userData.beastModel; // своя модель (src/beast-models.js) — уже в цветах вида
    mesh.traverse(function(o) {
        if (!o.isMesh || !o.material) return;
        if (o.userData && o.userData.isEye) { o.material = eyeMat; o.userData.dayMat = eyeMat; o.userData.nightMat = eyeMat; eyes.push(o); return; }
        if (own) return;
        const m = o.material, lum = m.color ? (m.color.r + m.color.g + m.color.b) / 3 : 0.5;
        if (!m.map && lum < 0.15) return; // нос, когти, тёмное — как было
        if (!m.map && lum > 0.85) { o.material = tintMat(m, 0xd8d0c0); return; } // белое (зубы, пятна) — костяное
        o.material = tintMat(m, def.tint);
    });
    if (typeof document !== 'undefined') addFeatures(mesh, def, eyes);
    return true;
}
