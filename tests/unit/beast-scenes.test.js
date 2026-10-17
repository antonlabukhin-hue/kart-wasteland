import { describe, it, expect } from 'vitest';
import { planScene, SCENES, ZONE_SCENES } from '../../src/beast-scenes.js';
import { ambientState, calmPool, AMB_FLEE, AMB_ALERT } from '../../src/ambient-beasts.js';
import { forceRole, TRIG_K } from '../../src/animal-attack.js';
import { THEMES } from '../../src/infinite.js';

describe('Пустошь: звериные сценки и живой фон', () => {
    it('у каждого пейзажа — свои сценки, подряд одна и та же не повторяется', () => {
        THEMES.forEach((t) => { expect(ZONE_SCENES[t.id], t.id).toBeTruthy(); ZONE_SCENES[t.id].forEach((k) => expect(SCENES[k]).toBeTruthy()); });
        let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        let last = null;
        for (let i = 0; i < 30; i++) { const p = planScene('day', r, last); expect(p.kind).not.toBe(last); expect(p.beasts.length).toBeGreaterThan(0); last = p.kind; }
        const pack = planScene('city', () => 0, null);
        expect(pack.kind).toBe('pack'); expect(pack.beasts.map((b) => b.sp)).toEqual(['DOG', 'DOG', 'DOG']);
    });
    it('роль зверя сцены: порог выхода по роли, гигант — обратно обычный', () => {
        const a = { giant: true, radius: 2, mesh: { scale: { setScalar(k) { this.k = k; } } } };
        forceRole(a, 'charge', 15, () => 0.5);
        expect(a.giant).toBe(false); expect(a.mesh.scale.k).toBe(1); expect(a._trigDist).toBeCloseTo(15 * TRIG_K.charge);
    });
    it('пасущиеся: далеко — пасутся, ближе — смотрят, совсем близко — бегут; хищники-одиночки не пасутся', () => {
        expect(ambientState(AMB_ALERT + 5)).toBe('graze');
        expect(ambientState(AMB_ALERT - 1)).toBe('alert');
        expect(ambientState(AMB_FLEE - 1)).toBe('flee');
        expect(calmPool(['LION', 'BEAR', 'DEER'])).toEqual(['DEER']);
        expect(calmPool(['LION']).length).toBeGreaterThan(0);
    });
});
