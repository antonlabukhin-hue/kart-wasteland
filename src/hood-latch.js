/**
 * Пустошь: зверь вцепился в капот. Прыгнувший волк (лиса, лев…) не просто сбивает полсердца — он висит на капоте,
 * закрывает обзор, и его надо стряхнуть: резко подёргать рулём влево-вправо SHAKES раз за HOLD секунд.
 * Стряхнул — «Стряхнул!» и зверь улетает; не успел — полсердца, как обычный удар.
 *
 * shakeStep(st, x) — учёт рывков по положению машины (чистая функция, тест), createLatch(o) — модель на капоте и показ.
 */
import * as THREE from 'three';
import { makeAnimal } from './zombie-look.js';
import { setEyes } from './beast-kit.js';

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
    // новый заезд: шкала и красные края от прошлого (заезд кончился, пока зверь висел на капоте) — убрать
    if (typeof document !== 'undefined') { const old = document.getElementById('latch-bar'); if (old) old.remove(); document.body.classList.remove('hood-latch'); }
    const flying = []; // стряхнутые звери: летят кувырком с машины
    const sfx = function(name, vol, pitch) { try { if (window.soundEngine) window.soundEngine.playSfx(name, vol, pitch); } catch (e) {} };
    const release = function(ok) {
        if (mesh && car) {
            if (ok && car.parent) { // слетает: в сторону последнего рывка, вверх и назад, кувыркаясь
                const side = st && st.dir ? -st.dir : (Math.random() < 0.5 ? -1 : 1);
                car.parent.attach(mesh);
                flying.push({ m: mesh, t: 0, v: new THREE.Vector3(side * 5.5, 4.2, 7), spin: new THREE.Vector3(6 + Math.random() * 4, 3, side * 9) });
                sfx('whoosh', 1.1, 0.8); sfx('hit', 0.9, 0.7);
            } else car.remove(mesh);
        }
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
            try { mesh = makeAnimal(a.speciesKey); } catch (e) { return false; }
            st = latchState(); car = c; fail = onFail; st.sp = a.speciesKey;
            setEyes(mesh, 1, 0); // на капоте — глаза горят
            // на капоте: мордой к стеклу, чуть наискосок; масштаб — с поправкой на масштаб машины
            const k = 1 / (c.scale.x || 1);
            // на капоте: точка в мире (над капотом перед лобовым) → в координаты машины (у неё свой масштаб и сдвиг модели)
            c.updateMatrixWorld(true);
            hood = c.worldToLocal(c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.03, 0.62, -0.62)));
            mesh.scale.setScalar(0.55 * k); mesh.position.copy(hood); mesh.rotation.set(0.45, 0.25, 0);
            c.add(mesh);
            document.body.classList.add('hood-latch');
            sfx('scrape', 1.2, 0.7); sfx('boss_roar', 0.7, 1.9); // когти по капоту и рык
            try { o.plaque('🐺 ВЦЕПИЛСЯ В КАПОТ!', 'Дёргай руль ← → ← → — стряхни его', 'crate-bad'); } catch (e) {}
            bar = document.createElement('div'); bar.id = 'latch-bar';
            bar.innerHTML = Array.from({ length: SHAKES }, function() { return '<i></i>'; }).join('') + '<u><b></b></u>';
            document.body.appendChild(bar);
            return true;
        },
        tick: function(dt, x) {
            for (let i = flying.length - 1; i >= 0; i--) { // полёт стряхнутого: дуга, кувырок, удар о землю — и пропал
                const fl = flying[i]; fl.t += dt; fl.v.y -= 16 * dt;
                fl.m.position.addScaledVector(fl.v, dt); fl.m.rotation.x += fl.spin.x * dt; fl.m.rotation.y += fl.spin.y * dt; fl.m.rotation.z += fl.spin.z * dt;
                if (fl.m.position.y < 0.05 && fl.v.y < 0) { fl.m.position.y = 0.05; fl.v.y *= -0.35; fl.v.x *= 0.5; fl.v.z *= 0.5; if (!fl.bounced) { fl.bounced = true; sfx('bump', 0.8, 0.6); } }
                if (fl.t > 1.4) { if (fl.m.parent) fl.m.parent.remove(fl.m); flying.splice(i, 1); }
            }
            if (!st) return;
            st.t += dt;
            const n0 = st.shakes, n = shakeStep(st, x);
            if (n > n0 && n < SHAKES) sfx('bump', 1.0, 0.8 + n * 0.15); // рывок — зверя мотает
            if (mesh) { mesh.rotation.z = Math.sin(st.t * 22) * 0.12 + (st.dir || 0) * 0.15; mesh.position.y = hood.y + Math.abs(Math.sin(st.t * 11)) * 0.05 / (car.scale.x || 1); }
            if (mesh && st.sp === 'MONKEY') { // обезьяна стучит по капоту: подскакивает и бьёт лапами — слышно (подпись вида, src/beast-behavior.js)
                const ph = Math.sin(st.t * 16); mesh.position.y = hood.y + Math.abs(ph) * 0.14 / (car.scale.x || 1);
                if (ph < 0 && (st.lastPh || 0) >= 0) sfx('bump', 0.45, 1.7); st.lastPh = ph;
            }
            if (bar) { const is = bar.querySelectorAll('i'); for (let i = 0; i < is.length; i++) is[i].className = i < n ? 'on' : ''; bar.querySelector('b').style.width = Math.max(0, 100 - st.t / HOLD * 100) + '%'; }
            if (n >= SHAKES) release(true);
            else if (st.t >= HOLD) release(false);
        },
        dispose: function() { if (st) { fail = null; release(false); } }
    };
}

