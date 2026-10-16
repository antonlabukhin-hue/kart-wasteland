/**
 * Пустошь: звери — бешеные. Та же модель, но шкура блёклая, в болотную зелень, с тёмными проплешинами,
 * глаза горят красным днём и ночью. Перекраска один раз на модель (пул зверей переиспользует меши).
 *
 * sickRgb — цвет пикселя шкуры (чистая функция, тест), zombify(mesh) — перекрасить модель зверя.
 */
import * as THREE from 'three';
import { dressBeast } from './beast-kit.js';
import { buildBeast } from './beast-models.js';
import { addOutline } from './beast-outline.js';

/** Зверь пустоши по виду: своя модель (src/beast-models.js), если есть, иначе прежняя из main.js; окрас, мутации и тёмный контур (src/beast-outline.js) */
export function makeAnimal(species) {
    const fn = typeof window !== 'undefined' && window.createAnimalMesh;
    const m = buildBeast(species) || (fn ? fn(species) : null);
    if (!m) return null;
    zombify(m, species);
    try { addOutline(m); } catch (e) {}
    return m;
}

/** Цвет шкуры «больного» зверя: выцветший, темнее, с уходом в болотную зелень */
export function sickRgb(r, g, b) {
    const grey = (r + g + b) / 3;
    const f = function(v, t) { const d = v * 0.35 + grey * 0.65; return Math.round(Math.max(0, Math.min(255, (d + (t - d) * 0.32) * 0.82))); };
    return [f(r, 106), f(g, 122), f(b, 72)];
}

const EYE = typeof document !== 'undefined' ? new THREE.MeshBasicMaterial({ color: 0xff2a1a }) : null;
const maps = new Map(), mats = new Map();

function sickMap(t) {
    if (maps.has(t)) return maps.get(t);
    let out = t;
    try {
        const im = t.image, w = im.width || 64, h = im.height || 64;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const s = sickRgb(p[i], p[i + 1], p[i + 2]); p[i] = s[0]; p[i + 1] = s[1]; p[i + 2] = s[2]; }
        x.putImageData(d, 0, 0);
        // проплешины и грязь
        for (let i = 0; i < 9; i++) {
            const px = ((i * 37) % 97) / 97 * w, py = ((i * 61) % 89) / 89 * h, rr = (0.06 + (i % 4) * 0.03) * w;
            const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(40,30,24,0.6)'); g.addColorStop(1, 'rgba(40,30,24,0)');
            x.fillStyle = g; x.fillRect(0, 0, w, h);
        }
        out = new THREE.CanvasTexture(c);
        ['colorSpace', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'flipY'].forEach(function(k) { out[k] = t[k]; });
        out.repeat.copy(t.repeat); out.offset.copy(t.offset); out.userData.keep = true;
    } catch (e) { out = t; }
    maps.set(t, out);
    return out;
}

function sickMat(m) {
    if (mats.has(m)) return mats.get(m);
    const c = m.clone();
    if (c.map) c.map = sickMap(c.map);
    else if (c.color) { const s = sickRgb(c.color.r * 255, c.color.g * 255, c.color.b * 255); c.color.setRGB(s[0] / 255, s[1] / 255, s[2] / 255); }
    mats.set(m, c);
    return c;
}

let glowMat = null;
/** Свечение глаз: мягкое красное пятно (аддитивно) — горящие глаза видно издалека, днём и ночью */
function eyeGlow() {
    if (!glowMat) {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,80,40,0.8)'); g.addColorStop(1, 'rgba(255,0,0,0)');
        x.fillStyle = g; x.fillRect(0, 0, 32, 32);
        const t = new THREE.CanvasTexture(c); t.userData.keep = true;
        glowMat = new THREE.SpriteMaterial({ map: t, color: 0xff3020, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
    }
    return new THREE.Sprite(glowMat);
}

/** Перекрасить модель зверя в «бешеную» (повторный вызов ничего не делает) */
export function zombify(mesh, species) {
    if (!mesh || mesh.userData.zombie) return mesh;
    if (species && dressBeast(mesh, species)) return mesh; // у вида своё лицо (src/beast-kit.js)
    mesh.userData.zombie = true;
    const eyes = [];
    mesh.traverse(function(o) {
        if (!o.isMesh || !o.material) return;
        if (o.userData && o.userData.isEye) { o.material = EYE; o.userData.dayMat = EYE; o.userData.nightMat = EYE; eyes.push(o); return; }
        o.material = Array.isArray(o.material) ? o.material.map(sickMat) : sickMat(o.material);
    });
    // горящие глаза: свечение — в системе координат зверя (модель ещё в начале координат)
    if (typeof document !== 'undefined' && eyes.length) {
        mesh.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert(), v = new THREE.Vector3();
        eyes.forEach(function(e) { const s = eyeGlow(); e.getWorldPosition(v).applyMatrix4(inv); s.position.copy(v); s.scale.setScalar(0.12); s.userData.eyeGlow = true; mesh.add(s); });
    }
    return mesh;
}
