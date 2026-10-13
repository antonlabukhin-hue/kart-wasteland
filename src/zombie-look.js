/**
 * Пустошь: звери — бешеные. Та же модель, но шкура блёклая, в болотную зелень, с тёмными проплешинами,
 * глаза горят красным днём и ночью. Перекраска один раз на модель (пул зверей переиспользует меши).
 *
 * sickRgb — цвет пикселя шкуры (чистая функция, тест), zombify(mesh) — перекрасить модель зверя.
 */
import * as THREE from 'three';

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

/** Перекрасить модель зверя в «бешеную» (повторный вызов ничего не делает) */
export function zombify(mesh) {
    if (!mesh || mesh.userData.zombie) return mesh;
    mesh.userData.zombie = true;
    mesh.traverse(function(o) {
        if (!o.isMesh || !o.material) return;
        if (o.userData && o.userData.isEye) { o.material = EYE; o.userData.dayMat = EYE; o.userData.nightMat = EYE; return; }
        o.material = Array.isArray(o.material) ? o.material.map(sickMat) : sickMat(o.material);
    });
    return mesh;
}
