/**
 * Пустошь: пыль из-под ног зверя — след действия, а не украшение: кабан роет землю, медведь опускается на лапы,
 * обезьяна приземляется. Пул мягких спрайтов: облачко растёт, поднимается и тает за ~0.6 с.
 * createDust(scene) → { puff(x, y, z, size), tick(dt), dispose() }; puffStep — чистая (тест).
 */
import * as THREE from 'three';

export const DUST_LIFE = 0.6, DUST_POOL = 24;

/** Облачко в момент t (0..DUST_LIFE): { scale (×size), rise (ед.), alpha } */
export function puffStep(t) {
    const k = Math.max(0, Math.min(1, t / DUST_LIFE));
    return { scale: 0.5 + 1.1 * k, rise: 0.35 * k, alpha: 0.42 * (1 - k) * Math.min(1, k * 6) };
}

let tex = null;
function dustTex() {
    if (tex || typeof document === 'undefined') return tex;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(150,128,100,1)'); g.addColorStop(0.6, 'rgba(120,100,80,0.5)'); g.addColorStop(1, 'rgba(110,90,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    tex = new THREE.CanvasTexture(c); tex.userData.keep = true; return tex;
}

export function createDust(scene) {
    const pool = [];
    for (let i = 0; i < DUST_POOL; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex(), transparent: true, opacity: 0, depthWrite: false }));
        s.visible = false; s.userData.dynamic = true; s.frustumCulled = false;
        if (scene) scene.add(s);
        pool.push({ s: s, t: DUST_LIFE, size: 1, y0: 0 });
    }
    let next = 0;
    return {
        puff: function(x, y, z, size) {
            const p = pool[next]; next = (next + 1) % pool.length;
            p.t = 0; p.size = size || 0.6; p.y0 = y || 0.1;
            p.s.position.set(x + (Math.random() - 0.5) * 0.3, p.y0, z + (Math.random() - 0.5) * 0.3); p.s.visible = true;
        },
        tick: function(dt) {
            for (let i = 0; i < pool.length; i++) {
                const p = pool[i]; if (p.t >= DUST_LIFE) continue;
                p.t += dt;
                if (p.t >= DUST_LIFE) { p.s.visible = false; continue; }
                const st = puffStep(p.t);
                p.s.scale.setScalar(p.size * st.scale); p.s.position.y = p.y0 + st.rise; p.s.material.opacity = st.alpha;
            }
        },
        dispose: function() { pool.forEach(function(p) { if (p.s.parent) p.s.parent.remove(p.s); p.s.material.dispose(); }); pool.length = 0; }
    };
}
