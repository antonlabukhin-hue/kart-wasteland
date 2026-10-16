/**
 * Пустошь: последняя авария — не сухое «Заезд окончен», а кадр, который хочется запомнить (как облёт, когда ловит босс):
 * машину подбрасывает и переворачивает на бок, вспыхивает огонь и валит дым, искры, камера медленно облетает место аварии
 * снизу, поверх — чёрные полосы «кино» и надпись. Потом — как обычно (итоги, «Второй шанс»).
 *
 * crashPose(k) — как лежит машина в момент k 0..1 (чистая функция, тест); crashCine(o) — ролик.
 * o: { scene, camera, renderer, car, onDone, dur }
 */
import * as THREE from 'three';
import { wreckFx } from './wrecks.js';

export const CINE_DUR = 2.8;

/** Подбросило (y — дуга), перевернуло на бок (roll) и развернуло (yaw); к концу — лежит */
export function crashPose(k) {
    const t = Math.max(0, Math.min(1, k));
    const air = Math.min(1, t / 0.35);
    return { y: Math.sin(air * Math.PI) * 0.9, roll: Math.min(1, t / 0.4) * 1.9, yaw: Math.min(1, t / 0.5) * 0.9 };
}

let sparkMat = null;
function spark() {
    if (!sparkMat) {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const x = c.getContext('2d'), g = x.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,200,80,0)');
        x.fillStyle = g; x.fillRect(0, 0, 16, 16);
        const t = new THREE.CanvasTexture(c); t.userData.keep = true;
        sparkMat = new THREE.SpriteMaterial({ map: t, color: 0xffb040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    }
    return new THREE.Sprite(sparkMat);
}

export function crashCine(o) {
    const car = o.car, cam = o.camera, dur = o.dur || CINE_DUR, scene = o.scene;
    const p0 = car.position.clone(), r0 = car.rotation.clone(), cx = p0.x, cz = p0.z;
    const fx = new THREE.Group(); fx.position.copy(p0); scene.add(fx);
    wreckFx(fx, { smoke: true, fire: true }, Math.random);
    const sparks = [];
    for (let i = 0; i < 18; i++) { const s = spark(); s.scale.setScalar(0.12 + Math.random() * 0.1); s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6); s.position.set(0, 0.5, 0); fx.add(s); sparks.push(s); }
    document.body.classList.add('arrest-cine', 'crash-cine');
    const cap = document.createElement('div'); cap.id = 'crash-cine-cap'; cap.innerHTML = '<b>РАЗБИЛСЯ</b><small>Пустошь забрала ещё одну машину</small>'; document.body.appendChild(cap);
    const side = cx > 0.5 ? -1 : 1;
    let tt = 0, last = performance.now(), done = false;
    const step = function(now) {
        if (done) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now; tt += dt;
        const k = Math.min(1, tt / dur), pose = crashPose(k);
        car.position.set(p0.x, p0.y + pose.y, p0.z);
        car.rotation.set(r0.x, r0.y + side * pose.yaw, r0.z + side * pose.roll);
        sparks.forEach(function(s) { const v = s.userData.v; v.y -= 9 * dt; s.position.addScaledVector(v, dt); if (s.position.y < 0.05) { s.position.y = 0.05; v.multiplyScalar(0.4); v.y = Math.abs(v.y); } s.material.opacity = 1 - k; });
        // камера: низко, медленный облёт с передней стороны; в начале — плавно из-за спины
        const ang = 0.6 + k * Math.PI * 0.9, R = 4.6 - k * 0.8, h = 0.7 + k * 1.3;
        const tx = cx + Math.sin(ang) * R * side, tz = cz - Math.cos(ang) * R;
        if (k < 0.1) cam.position.lerp(new THREE.Vector3(tx, h, tz), 0.3); else cam.position.set(tx, h, tz);
        cam.lookAt(cx, 0.5 + pose.y * 0.5, cz);
        o.renderer.render(scene, cam);
        if (k < 1) requestAnimationFrame(step);
        else {
            done = true;
            car.position.copy(p0); car.rotation.copy(r0);
            scene.remove(fx); cap.remove();
            document.body.classList.remove('arrest-cine', 'crash-cine');
            if (o.onDone) o.onDone();
        }
    };
    requestAnimationFrame(step);
}
