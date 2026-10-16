import { describe, it, expect } from 'vitest';
import { pickRole, prepAttack, stepAttack, laneNear, TRIG_K, LEAP_TURN, LANES } from '../../src/animal-attack.js';
import { shakeStep, latchState, SHAKES, SWING } from '../../src/hood-latch.js';

const fakeMesh = () => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, traverse() {} });
const animal = (species, x, z) => ({ speciesKey: species, x, z, mesh: fakeMesh(), hit: false });

describe('Пустошь: звери нападают', () => {
    it('роль — по виду: волк прыгает, кабан таранит, медведь встаёт; курица просто перебегает', () => {
        const yes = () => 0.1, no = () => 0.99;
        expect(pickRole('DOG', yes)).toBe('lunge');
        expect(pickRole('BOAR', yes)).toBe('charge');
        expect(pickRole('BEAR', yes)).toBe('giant'); // часть медведей — гиганты
        const notGiant = (() => { const q = [0.9, 0.1]; let i = 0; return () => q[i++ % 2]; })();
        expect(pickRole('BEAR', notGiant)).toBe('block');
        expect(pickRole('CHICKEN', yes)).toBe('cross');
        expect(pickRole('DOG', no)).toBe('cross'); // часть волков всё-таки просто перебегает
    });

    it('выскакивают из-за обочины ближе, чем раньше; нападающие — чуть раньше, чтобы успеть увернуться', () => {
        const a = prepAttack(animal('DOG', 4.5, -40), () => 0.1, 15);
        expect(a.role).toBe('lunge');
        expect(a._trigDist).toBeGreaterThan(15);
        expect(TRIG_K.cross).toBeLessThan(1);
        expect(TRIG_K.charge).toBeGreaterThan(TRIG_K.lunge);
    });

    it('прыгун: в полосу машины → присел → прыжок навстречу; уйдёшь в соседнюю полосу — промахнётся', () => {
        const a = prepAttack(animal('DOG', 4.5, -30), () => 0.1, 15);
        let pz = 0, px = 0;
        const dt = 1 / 60;
        for (let i = 0; i < 30; i++) stepAttack(a, dt, pz, px);
        expect(laneNear(a.x)).toBe(0); // выбежал в полосу машины
        expect(['crouch', 'leap']).toContain(a.phase);
        px = 2; // игрок ушёл вправо
        const x0 = a.x;
        for (let i = 0; i < 60; i++) stepAttack(a, dt, pz, px);
        expect(a.x - x0).toBeLessThanOrEqual(LEAP_TURN * 1.0 + 1e-6); // доворот в прыжке — не больше LEAP_TURN ед./с
        expect(Math.abs(px - a.x)).toBeGreaterThan(0.8);
        // проскочил мимо — «увернулся»
        a.z = pz + 2; stepAttack(a, dt, pz, px);
        expect(a.dodged).toBe('new');
    });

    it('таран: бежит навстречу по своей полосе, не сворачивает', () => {
        const a = prepAttack(animal('BOAR', -4.5, -40), () => 0.1, 15);
        for (let i = 0; i < 40; i++) stepAttack(a, 1 / 60, 0, 2);
        expect(a.phase).toBe('charge');
        const x = a.x, z = a.z;
        for (let i = 0; i < 30; i++) stepAttack(a, 1 / 60, 0, -2);
        expect(a.x).toBe(x);
        expect(a.z).toBeGreaterThan(z);
        expect(LANES).toContain(a.x);
    });

    it('медведь встаёт в полосе и стоит', () => {
        const a = prepAttack(animal('BEAR', 4.5, -40), (() => { const q = [0.9, 0.1, 0.5]; let i = 0; return () => q[i++ % 3]; })(), 15);
        for (let i = 0; i < 90; i++) stepAttack(a, 1 / 60, 0, 0);
        expect(a.phase).toBe('stand');
        const z = a.z;
        stepAttack(a, 1 / 60, 0, 0);
        expect(a.z).toBe(z);
        expect(LANES).toContain(a.x);
    });

    it('простая перебежка — по-старому (модуль не трогает)', () => {
        const a = prepAttack(animal('CHICKEN', 4.5, -40), () => 0.1, 15);
        expect(stepAttack(a, 1 / 60, 0, 0)).toBe(false);
    });
});

describe('Пустошь: зверь на капоте — стряхнуть рулём', () => {
    it('рывок засчитывается только при смене направления с размахом', () => {
        const st = latchState();
        let x = 0;
        shakeStep(st, x);
        for (let k = 0; k < SHAKES; k++) {
            const to = k % 2 ? -0.4 : 0.4;
            for (let i = 0; i < 10; i++) { x += (to - x) * 0.4; shakeStep(st, x); }
        }
        expect(st.shakes).toBeGreaterThanOrEqual(SHAKES - 1);
        const calm = latchState();
        for (let i = 0; i < 50; i++) shakeStep(calm, Math.sin(i) * SWING * 0.2); // дрожание на месте — не рывки
        expect(calm.shakes).toBe(0);
    });
});

import { crashPose, VARIANTS } from '../../src/crash-cine.js';
describe('Пустошь: ролики последней аварии', () => {
    it('четыре разных ролика; в каждом машину подбрасывает или крутит, к концу — на земле', () => {
        expect(VARIANTS.length).toBe(4);
        VARIANTS.forEach((v) => {
            expect(crashPose(v, 0).y).toBeCloseTo(0, 6);
            expect(crashPose(v, 1).y).toBeCloseTo(0, 6);
            const mid = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((k) => crashPose(v, k));
            expect(mid.some((p) => p.y > 0.5 || Math.abs(p.yaw) > 2), v).toBe(true);
        });
        expect(Math.abs(crashPose('barrel', 1).pitch)).toBeGreaterThan(Math.PI * 4);
        expect(crashPose('launch', 0.4).y).toBeGreaterThan(3);
    });
});;

import { createLatch } from '../../src/hood-latch.js';
describe('Пустошь: шкала «стряхни» не переезжает в следующий заезд', () => {
    it('новый заезд убирает оставшуюся шкалу и красные края', () => {
        const removed = [], cls = new Set(['hood-latch']);
        globalThis.document = { getElementById: (id) => (id === 'latch-bar' ? { remove: () => removed.push(id) } : null), body: { classList: { remove: (c) => cls.delete(c), add: (c) => cls.add(c), contains: (c) => cls.has(c) } } };
        createLatch({});
        expect(removed).toEqual(['latch-bar']);
        expect(cls.has('hood-latch')).toBe(false);
        delete globalThis.document;
    });
});

import { GIANT, GIANT_SCALE, GIANT_VZ, CHARGE_VZ, HIT_R_MAX, LANES } from '../../src/animal-attack.js';
describe('Пустошь: гигант несётся навстречу', () => {
    it('мамонт иногда вырастает и несётся по полосе быстрее тарана; удар шире', () => {
        expect(GIANT).toContain('ELEPHANT');
        const a = prepAttack({ speciesKey: 'ELEPHANT', x: 4.5, z: -60, radius: 0.6, mesh: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { multiplyScalar(k) { this.k = k; } }, traverse() {} }, hit: false }, () => 0.1, 15);
        expect(a.role).toBe('giant');
        expect(a.mesh.scale.k).toBe(GIANT_SCALE);
        expect(a.radius).toBeGreaterThan(1);
        expect(GIANT_VZ).toBeGreaterThan(CHARGE_VZ);
        for (let i = 0; i < 60; i++) stepAttack(a, 1 / 60, 0, 0);
        expect(a.phase).toBe('charge');
        expect(a.roar).toBe('new');
        expect(pickRole('DOG', () => 0.1)).not.toBe('giant');
    });
    it('гиганта и крупного зверя можно объехать: из соседней полосы не задевают', () => {
        const mk = (sp, radius, roll) => prepAttack({ speciesKey: sp, x: 4.5, z: -60, radius: radius, mesh: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { multiplyScalar() {} }, traverse() {} }, hit: false }, () => roll, 15);
        const giant = mk('HIPPO', 1.25 * 1.3, 0.1), block = mk('BEAR', 1.3 * 1.3, 0.5);
        expect(giant.role).toBe('giant');
        const gap = LANES[1] - LANES[0];
        [giant, block].forEach((a) => { expect(a.radius).toBeLessThanOrEqual(HIT_R_MAX); expect(a.radius + 0.45).toBeLessThan(gap - 0.4); });
    });
});
