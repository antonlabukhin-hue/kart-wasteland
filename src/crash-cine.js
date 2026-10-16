/**
 * Пустошь: последняя авария — каждый раз свой ролик, который хочется запомнить (как облёт, когда ловит босс):
 *   flip    — подбросило и положило на бок, камера низко облетает;
 *   barrel  — машину запускает вверх и крутит бочкой вперёд, падает на крышу; камера снизу спереди;
 *   spin    — юзом крутит волчком, потом взрыв с ударной волной; камера сверху по кругу;
 *   launch  — замедленный полёт вверх и вперёд, кувырок, удар о землю; камера ведёт снизу сбоку.
 * Огонь, дым, искры, полосы «кино» и надпись. Машина не проваливается в асфальт: каждый кадр её нижняя точка
 * поднимается к земле (по габаритам). Потом — итоги, как обычно.
 *
 * VARIANTS, crashPose(variant, k) — поза в момент k 0..1 (чистая, тест); crashCine(o) — ролик.
 * o: { scene, camera, renderer, car, onDone, dur, variant }
 */
import * as THREE from 'three';
import { wreckFx } from './wrecks.js';

export const VARIANTS = ['flip', 'barrel', 'spin', 'launch'];
export const CINE_DUR = { flip: 2.8, barrel: 3.2, spin: 3.0, launch: 3.6 };
const CAPS = {
    flip: ['РАЗБИЛСЯ', 'Пустошь забрала ещё одну машину'],
    barrel: ['КУВЫРОК!', 'Три оборота — и на крышу'],
    spin: ['БА-БАХ!', 'От машины остался только дым'],
    launch: ['В ПОЛЁТ!', 'Красиво летел. Недолго.']
};
const ease = function(t) { return t * t * (3 - 2 * t); };
const clamp01 = function(t) { return Math.max(0, Math.min(1, t)); };

/** Поза машины: y — высота (до прижатия к земле), roll/pitch/yaw — повороты, dz — сдвиг вперёд (к −z), dx — вбок */
export function crashPose(variant, k) {
    const t = clamp01(k);
    if (variant === 'barrel') {
        const air = clamp01(t / 0.62);
        return { y: Math.sin(air * Math.PI) * 2.6, pitch: -ease(air) * (Math.PI * 4 + Math.PI), roll: 0, yaw: ease(t) * 0.4, dz: ease(clamp01(t / 0.7)) * 7, dx: 0 };
    }
    if (variant === 'spin') {
        const slide = ease(clamp01(t / 0.55));
        return { y: t > 0.55 ? Math.sin(clamp01((t - 0.55) / 0.3) * Math.PI) * 1.4 : 0, pitch: 0, roll: t > 0.55 ? ease(clamp01((t - 0.55) / 0.3)) * Math.PI : 0, yaw: slide * Math.PI * 3, dz: slide * 5, dx: slide * 1.2 };
    }
    if (variant === 'launch') {
        const air = clamp01(t / 0.75), slow = Math.sin(air * Math.PI / 2); // вначале быстро, наверху — «зависает»
        return { y: Math.sin(air * Math.PI) * 4.2, pitch: -air * Math.PI * 1.5, roll: air * 0.8, yaw: air * 0.6, dz: slow * 11, dx: air * 1.5 };
    }
    // flip
    const air = clamp01(t / 0.35);
    return { y: Math.sin(air * Math.PI) * 0.9, pitch: 0, roll: clamp01(t / 0.4) * 1.9, yaw: clamp01(t / 0.5) * 0.9, dz: 0, dx: 0 };
}

let sparkMat = null, flashMat = null;
function soft(color, fade) {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(c); t.userData.keep = true;
    return new THREE.SpriteMaterial({ map: t, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: fade || 1 });
}
function spark() { if (!sparkMat) sparkMat = soft(0xffb040); return new THREE.Sprite(sparkMat); }

const box = new THREE.Box3();
/** Нижняя точка машины — не ниже асфальта */
function onGround(car, floor) {
    car.updateMatrixWorld(true);
    box.setFromObject(car);
    if (box.min.y < floor) car.position.y += floor - box.min.y;
}

export function crashCine(o) {
    const variant = o.variant && VARIANTS.indexOf(o.variant) >= 0 ? o.variant : VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    const car = o.car, cam = o.camera, dur = o.dur || CINE_DUR[variant], scene = o.scene;
    const p0 = car.position.clone(), r0 = car.rotation.clone(), cx = p0.x, cz = p0.z, side = cx > 0.5 ? -1 : 1;
    const sfx = function(n, v, p) { try { if (window.soundEngine) window.soundEngine.playSfx(n, v, p); } catch (e) {} };
    // огонь и дым — над машиной (едут вместе с ней)
    const fx = new THREE.Group(); scene.add(fx);
    wreckFx(fx, { smoke: true, fire: true }, Math.random);
    const sparks = [];
    for (let i = 0; i < 22; i++) { const s = spark(); s.scale.setScalar(0.12 + Math.random() * 0.12); s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 7, 2 + Math.random() * 5, (Math.random() - 0.5) * 7); scene.add(s); sparks.push(s); }
    let flash = null, boomed = false;
    document.body.classList.add('arrest-cine', 'crash-cine');
    const cap = document.createElement('div'); cap.id = 'crash-cine-cap'; cap.innerHTML = '<b>' + CAPS[variant][0] + '</b><small>' + CAPS[variant][1] + '</small>'; document.body.appendChild(cap);
    sfx('crash', 1.2); sfx('explode', 0.8);
    let tt = 0, last = performance.now(), done = false, landed = false;
    const target = new THREE.Vector3();
    const step = function(now) {
        if (done) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now; tt += dt;
        const k = Math.min(1, tt / dur), pose = crashPose(variant, k);
        car.position.set(p0.x + side * pose.dx, p0.y + pose.y, p0.z - pose.dz);
        car.rotation.set(r0.x + pose.pitch, r0.y + side * pose.yaw, r0.z + side * pose.roll);
        onGround(car, 0.02);
        fx.position.copy(car.position);
        if (!landed && pose.y < 0.05 && k > 0.3) { landed = true; sfx('bump', 1.2, 0.6); }
        sparks.forEach(function(s, i) { const v = s.userData.v; if (tt < 0.05) s.position.copy(car.position).add(new THREE.Vector3(0, 0.4, 0)); v.y -= 9 * dt; s.position.addScaledVector(v, dt); if (s.position.y < 0.05) { s.position.y = 0.05; v.multiplyScalar(0.4); v.y = Math.abs(v.y); } s.material.opacity = 1 - k; });
        // взрыв: в «волчке» — после разворота, в остальных — у земли в конце
        if (!boomed && ((variant === 'spin' && k > 0.55) || (variant !== 'spin' && k > 0.8))) {
            boomed = true; sfx('explode', 1.3, 0.8);
            if (!flashMat) flashMat = soft(0xffa040);
            flash = new THREE.Sprite(flashMat.clone()); flash.position.copy(car.position).add(new THREE.Vector3(0, 0.6, 0)); scene.add(flash);
        }
        if (flash) { const f = Math.min(1, (tt - (variant === 'spin' ? 0.55 : 0.8) * dur) / 0.7); flash.scale.setScalar(1 + f * 9); flash.material.opacity = Math.max(0, 1 - f); }
        // камера — у каждого ролика своя
        target.copy(car.position);
        let px, py, pz;
        if (variant === 'barrel') { const a = 0.4 + k * 0.6; px = target.x + side * 3.4; py = 0.5 + k * 1.2; pz = target.z - 4.5 * a; }
        else if (variant === 'spin') { const ang = k * Math.PI * 1.2; px = target.x + Math.sin(ang) * 7; py = 6 - k * 2; pz = target.z + Math.cos(ang) * 7; }
        else if (variant === 'launch') { px = target.x + side * 5 - k * side * 2; py = 0.4; pz = target.z + 3 - k * 6; }
        else { const ang = 0.6 + k * Math.PI * 0.9, R = 4.6 - k * 0.8; px = cx + Math.sin(ang) * R * side; py = 0.7 + k * 1.3; pz = cz - Math.cos(ang) * R; }
        if (k < 0.08) cam.position.lerp(new THREE.Vector3(px, py, pz), 0.3); else cam.position.set(px, py, pz);
        cam.lookAt(target.x, Math.max(0.4, target.y * 0.8 + 0.3), target.z);
        o.renderer.render(scene, cam);
        if (k < 1) requestAnimationFrame(step);
        else {
            done = true;
            car.position.copy(p0); car.rotation.copy(r0);
            scene.remove(fx); sparks.forEach(function(s) { scene.remove(s); }); if (flash) scene.remove(flash); cap.remove();
            document.body.classList.remove('arrest-cine', 'crash-cine');
            if (o.onDone) o.onDone();
        }
    };
    requestAnimationFrame(step);
    return variant;
}
