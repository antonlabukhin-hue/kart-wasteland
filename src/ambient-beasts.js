/**
 * Пустошь: живой фон — звери, которые не нападают. Пасутся группками в поле за обочиной (свой состав у каждого пейзажа),
 * поднимают голову, когда машина подъезжает, и разбегаются прочь от дороги. На дорогу не выходят, не сталкиваются.
 * Спокойный зверь делает нападающего страшнее: видно, что мир живёт, а бешеные — выбиваются из него.
 *
 * ambientState(d) — что делает зверь при машине в d ед. позади него (чистая, тест);
 * createAmbient(o) → { tick(dt, z, now, pool), dispose() } — o: { scene, make(species) → mesh, trackWidth, lite }.
 */
import { poseIdle, poseAlert } from './beast-behavior.js';

export const AMB_MAX = 4, AMB_MAX_LITE = 2, AMB_ALERT = 30, AMB_FLEE = 15, AMB_FLEE_V = 6;
/** Кто пасётся в поле: крупные и пугливые (хищники-одиночки — на дороге) */
const CALM = ['DEER', 'BOAR', 'ZEBRA', 'GIRAFFE', 'ELEPHANT', 'HIPPO', 'RHINO', 'MONKEY', 'FOX', 'DOG', 'CROC'];

export function ambientState(d) { return d < AMB_FLEE ? 'flee' : d < AMB_ALERT ? 'alert' : 'graze'; }

/** Кого пустить пастись в этом пейзаже (pool — звери пейзажа) */
export function calmPool(pool) { const p = (pool || []).filter(function(k) { return CALM.indexOf(k) >= 0; }); return p.length ? p : ['DEER', 'BOAR']; }

export function createAmbient(o) {
    const max = o.lite ? AMB_MAX_LITE : AMB_MAX, live = [], spare = {};
    let next = 0;
    const take = function(sp) {
        const list = spare[sp] || (spare[sp] = []);
        const m = list.pop() || (o.make ? o.make(sp) : null);
        if (m && !m.parent && o.scene) o.scene.add(m);
        return m;
    };
    const drop = function(b) { if (!b.m) return; b.m.visible = false; (spare[b.sp] = spare[b.sp] || []).push(b.m); };
    const legsRun = function(m, t) { if (m.traverse) m.traverse(function(q) { if (q.userData && q.userData.isLeg) { const i = q.userData.legIndex | 0; q.rotation.x = Math.sin(t * 16 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6; } }); };
    return {
        tick: function(dt, z, now, pool) {
            // новая группка — далеко впереди, в поле с одной стороны
            if (live.length < max && now > next) {
                next = now + 2.5 + Math.random() * 3;
                const kinds = calmPool(pool), sp = kinds[Math.floor(Math.random() * kinds.length)];
                const side = Math.random() < 0.5 ? -1 : 1, z0 = z - 110 - Math.random() * 50, n = Math.min(max - live.length, 1 + Math.floor(Math.random() * 3));
                for (let i = 0; i < n; i++) {
                    const m = take(sp); if (!m) break;
                    const x = side * (o.trackWidth / 2 + 7 + Math.random() * 9), zz = z0 - i * (2 + Math.random() * 3);
                    m.visible = true; m.position.set(x, 0, zz); m.rotation.set(0, Math.random() * 6.28, 0);
                    const s = 0.85 + Math.random() * 0.3; m.scale.setScalar(s);
                    live.push({ m: m, sp: sp, x: x, z: zz, side: side, ph: Math.random() * 6, t: 0 });
                }
            }
            for (let i = live.length - 1; i >= 0; i--) {
                const b = live[i], d = z - b.z;
                b.t += dt;
                const st = ambientState(d);
                if (st === 'graze') poseIdle(b.m, now, b.ph);
                else if (st === 'alert') poseAlert(b.m, now, Math.atan2(-b.x, Math.max(1, d)));
                else { // бегут прочь от дороги
                    b.x += b.side * AMB_FLEE_V * dt; b.m.position.x = b.x;
                    b.m.rotation.set(0, b.side * Math.PI / 2, 0); b.m.position.y = Math.abs(Math.sin(b.t * 16)) * 0.08;
                    legsRun(b.m, b.t);
                }
                if (d < -12 || Math.abs(b.x) > o.trackWidth / 2 + 40) { drop(b); live.splice(i, 1); }
            }
        },
        count: function() { return live.length; },
        dispose: function() { live.forEach(drop); live.length = 0; }
    };
}
