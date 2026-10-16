/**
 * Пустошь: зверь — самое заметное в кадре. Блёклый «бешеный» окрас сливался с бурой пустошью, поэтому:
 *   — тёмный контур: на каждой детали — чуть увеличенная копия, вывернутая наизнанку (BackSide), без тумана;
 *   — аура нападения: за ~1 с до броска (зверь заметил машину, src/animals.js onTell) и во время прыжка/тарана
 *     контур разгорается красным и пульсирует — «сейчас бросится».
 *
 * addOutline(mesh) — один раз на модель (пул зверей переиспользует меши), auraLevel(a, t) — сила подсветки
 * (чистая, тест), setAura(mesh, v) — покрасить контур.
 */
import * as THREE from 'three';

export const OUTLINE_W = 0.05;    // толщина контура, ед. мира (зверь масштаба 1)
export const OUTLINE_MIN = 0.03;  // детали мельче (когти, зубы) — без контура: лишние вызовы отрисовки
export const AURA_COLOR = 0xff2a10;

/** Сила ауры 0..1: предупреждение — пульс, бросок — горит; перебегающий, сбитый, увернувшийся — нет */
export function auraLevel(a, t) {
    if (!a || a.hit || a.dodged || !a.role || a.role === 'cross') return 0;
    if (!a.triggered) return a.told ? 0.55 + 0.45 * Math.sin(t * 18) : 0;
    if (a.phase === 'stand') return 0.75 + 0.25 * Math.sin(t * 10);
    return a.phase ? 1 : 0.8;
}

/** Множитель масштаба оболочки по оси: half — полуразмер геометрии, s — масштаб детали относительно зверя */
export function hullK(half, s, w) {
    const r = Math.abs(half * s);
    return r > 1e-4 ? 1 + (w == null ? OUTLINE_W : w) / r : 1;
}

/** Навесить контур на модель (в начале координат, масштаб 1). Возвращает материал контура */
export function addOutline(root, w) {
    if (!root) return null;
    if (root.userData.outlineMat) return root.userData.outlineMat;
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false });
    root.userData.outlineMat = mat;
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4();
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const parts = [];
    root.traverse(function(o) { if (o.isMesh && o.geometry && !(o.userData && (o.userData.isEye || o.userData.outlineHull))) parts.push(o); });
    parts.forEach(function(o) {
        const g = o.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        const bb = g.boundingBox;
        m.multiplyMatrices(inv, o.matrixWorld).decompose(pos, q, s);
        const hx = (bb.max.x - bb.min.x) / 2, hy = (bb.max.y - bb.min.y) / 2, hz = (bb.max.z - bb.min.z) / 2;
        if (Math.max(hx * s.x, hy * s.y, hz * s.z) < OUTLINE_MIN) return;
        const h = new THREE.Mesh(g, mat);
        h.scale.set(hullK(hx, s.x, w), hullK(hy, s.y, w), hullK(hz, s.z, w));
        h.userData.outlineHull = true; h.castShadow = false; h.receiveShadow = false;
        h.raycast = function() {};
        o.add(h);
    });
    return mat;
}

const _c = typeof THREE.Color === 'function' ? new THREE.Color() : null, _aura = _c ? new THREE.Color(AURA_COLOR) : null;
/** Покрасить контур: 0 — чёрный, 1 — красный */
export function setAura(root, v) {
    const mat = root && root.userData.outlineMat;
    if (!mat) return;
    const k = Math.max(0, Math.min(1, v || 0));
    if (mat.userData.k === k) return;
    mat.userData.k = k;
    mat.color.setRGB(0, 0, 0).lerp(_aura, k);
}
