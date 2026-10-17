import { describe, it, expect } from 'vitest';
import { signatureOf, prepTime, eyeLevel, poseSignature, poseIdle, SIGNATURE, PREP } from '../../src/beast-behavior.js';
import { puffStep, DUST_LIFE } from '../../src/beast-fx.js';
import { prepAttack, stepAttack } from '../../src/animal-attack.js';

const mesh = () => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { multiplyScalar() {} }, traverse() {} });

describe('Пустошь: звери — персонажи (состояние, подпись, глаза)', () => {
    it('пять эталонных зверей — у каждого своя подпись; остальные — по роли', () => {
        expect(signatureOf({ speciesKey: 'BOAR', role: 'charge' })).toBe('scrape');
        expect(signatureOf({ speciesKey: 'BEAR', role: 'block' })).toBe('rear');
        expect(signatureOf({ speciesKey: 'DEER', role: 'charge' })).toBe('freeze');
        expect(signatureOf({ speciesKey: 'FOX', role: 'lunge' })).toBe('stalk');
        expect(signatureOf({ speciesKey: 'MONKEY', role: 'lunge' })).toBe('hop');
        expect(signatureOf({ speciesKey: 'DOG', role: 'lunge' })).toBe('crouch');
        expect(signatureOf({ speciesKey: 'BOAR', role: 'cross' })).toBe(null);
        expect(new Set(Object.values(SIGNATURE)).size).toBe(5);
    });
    it('подготовка длиннее у подписей и не короче полсекунды', () => {
        Object.values(PREP).forEach((t) => expect(t).toBeGreaterThanOrEqual(0.5));
        expect(prepTime({ speciesKey: 'BOAR', role: 'charge' })).toBeGreaterThan(prepTime({ speciesKey: 'RHINO', role: 'charge' }));
    });
    it('глаза: спокоен — тусклые, насторожился — тлеют, готовится — горят, ушёл — гаснут', () => {
        const a = { role: 'lunge' };
        expect(eyeLevel(a)).toBe(0);
        a.told = true; expect(eyeLevel(a)).toBe(0.5);
        a.triggered = true; a.phase = 'crouch'; expect(eyeLevel(a)).toBe(1);
        a.phase = 'leave'; expect(eyeLevel(a)).toBe(0);
    });
    it('медведь поднимается на дыбы, кабан роет землю (пыль), пасущийся — голова вниз', () => {
        const m = mesh();
        poseSignature('rear', m, 0.85, 0.85, 0); expect(m.rotation.x).toBeLessThan(-0.5); expect(m.position.y).toBeGreaterThan(0.1);
        let dust = 0; for (let t = 0; t < 0.9; t += 1 / 60) if (poseSignature('scrape', m, t, 0.9, 0)) dust++;
        expect(dust).toBeGreaterThan(0);
        poseIdle(m, 0, 0); expect(m.rotation.x).toBeGreaterThan(0.2);
    });
    it('кабан: сначала скребёт землю, потом таран, после — уходит с дороги', () => {
        const a = prepAttack({ speciesKey: 'BOAR', x: -4.5, z: -40, radius: 0.6, mesh: mesh(), hit: false }, () => 0.1, 15, 2000);
        expect(a.role).toBe('charge');
        const seen = new Set();
        for (let i = 0; i < 700; i++) { stepAttack(a, 1 / 60, 0, 2); seen.add(a.phase); }
        ['run', 'prep', 'charge', 'leave'].forEach((p) => expect(seen.has(p), p).toBe(true));
    });
    it('пыль: растёт, поднимается и тает', () => {
        const a = puffStep(0.05), b = puffStep(DUST_LIFE * 0.9);
        expect(b.scale).toBeGreaterThan(a.scale); expect(b.rise).toBeGreaterThan(a.rise); expect(b.alpha).toBeLessThan(0.2);
    });
});
