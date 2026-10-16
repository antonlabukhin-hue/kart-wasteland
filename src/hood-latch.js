/**
 * Пустошь: зверь вцепился в капот. Прыгнувший волк (лиса, лев…) не просто сбивает полсердца — он висит на капоте,
 * закрывает обзор, и его надо стряхнуть: резко подёргать рулём влево-вправо SHAKES раз за HOLD секунд.
 * Стряхнул — «Стряхнул!» и зверь улетает; не успел — полсердца, как обычный удар.
 *
 * shakeStep(st, x) — учёт рывков по положению машины (чистая функция, тест), createLatch(o) — модель на капоте и показ.
 */
import * as THREE from 'three';
import { zombify } from './zombie-look.js';

export const SHAKES = 3, HOLD = 2.6, SWING = 0.3;

/** Новое состояние захвата */
export function latchState() { return { t: 0, shakes: 0, dir: 0, ext: null }; }

/**
 * Рывок — смена направления руля с размахом не меньше SWING (ед. по x). st.ext — крайняя точка текущего хода.
 * Возвращает число засчитанных рывков.
 */
export function shakeStep(st, x) {
    if (st.ext == null) { st.ext = x; return st.shakes; }
    const d = x - st.ext;
    if (st.dir === 0) { if (Math.abs(d) >= SWING * 0.5) { st.dir = Math.sign(d); st.ext = x; } return st.shakes; }
    if (Math.sign(d) === st.dir) { st.ext = x; return st.shakes; } // продолжаем в ту же сторону — крайняя точка дальше
    if (Math.abs(d) >= SWING) { st.shakes++; st.dir = -st.dir; st.ext = x; } // развернулись с размахом — рывок
    return st.shakes;
}

/**
 * o: { plaque(t, s, cls), popup(t), onShook() } → { grab(animal, car, onFail) → bool, tick(dt, x), active }
 * car — машина игрока (зверь — её дочерний объект на капоте), onFail — полсердца.
 */
export function createLatch(o) {
    let st = null, mesh = null, car = null, fail = null, bar = null, hood = null;
    const release = function(ok) {
        if (mesh && car) car.remove(mesh);
        mesh = null; car = null;
        if (bar) { bar.remove(); bar = null; }
        document.body.classList.remove('hood-latch');
        const f = fail; fail = null; st = null;
        if (ok) { try { o.popup('💪 Стряхнул!'); } catch (e) {} if (o.onShook) o.onShook(); }
        else if (f) f();
    };
    return {
        get active() { return !!st; },
        grab: function(a, c, onFail) {
            if (st || !c || typeof window === 'undefined' || !window.createAnimalMesh) return false;
            try { mesh = zombify(window.createAnimalMesh(a.speciesKey)); } catch (e) { return false; }
            st = latchState(); car = c; fail = onFail;
            // на капоте: мордой к стеклу, чуть наискосок; масштаб — с поправкой на масштаб машины
            const k = 1 / (c.scale.x || 1);
            // на капоте: точка в мире (над капотом перед лобовым) → в координаты машины (у неё свой масштаб и сдвиг модели)
            c.updateMatrixWorld(true);
            hood = c.worldToLocal(c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.03, 0.62, -0.62)));
            mesh.scale.setScalar(0.55 * k); mesh.position.copy(hood); mesh.rotation.set(0.45, 0.25, 0);
            c.add(mesh);
            document.body.classList.add('hood-latch');
            try { o.plaque('🐺 ВЦЕПИЛСЯ В КАПОТ!', 'Дёргай руль ← → ← → — стряхни его', 'crate-bad'); } catch (e) {}
            bar = document.createElement('div'); bar.id = 'latch-bar';
            bar.innerHTML = Array.from({ length: SHAKES }, function() { return '<i></i>'; }).join('') + '<u><b></b></u>';
            document.body.appendChild(bar);
            return true;
        },
        tick: function(dt, x) {
            if (!st) return;
            st.t += dt;
            const n = shakeStep(st, x);
            if (mesh) { mesh.rotation.z = Math.sin(st.t * 22) * 0.12 + (st.dir || 0) * 0.15; mesh.position.y = hood.y + Math.abs(Math.sin(st.t * 11)) * 0.05 / (car.scale.x || 1); }
            if (bar) { const is = bar.querySelectorAll('i'); for (let i = 0; i < is.length; i++) is[i].className = i < n ? 'on' : ''; bar.querySelector('b').style.width = Math.max(0, 100 - st.t / HOLD * 100) + '%'; }
            if (n >= SHAKES) release(true);
            else if (st.t >= HOLD) release(false);
        },
        dispose: function() { if (st) { fail = null; release(false); } }
    };
}

