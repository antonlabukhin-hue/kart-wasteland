import { describe, it, expect } from 'vitest';
import { planAccents, ZONE_ACCENTS, blinkLevel, emberColor } from '../../src/zone-accents.js';
import { THEMES } from '../../src/infinite.js';

describe('Пустошь: яркие акценты в каждой зоне', () => {
    it('у каждого пейзажа свой набор акцентов и цвет тлеющих стен', () => {
        THEMES.forEach((t) => { expect(ZONE_ACCENTS[t.id], t.id).toBeTruthy(); expect(emberColor(t.id)).toBeGreaterThan(0); });
        expect(ZONE_ACCENTS.svalka.kinds).toContain('toxicPool');
        expect(ZONE_ACCENTS.city.kinds).toContain('neon');
        expect(ZONE_ACCENTS.jungle.kinds).toContain('mushrooms');
    });
    it('план — всё за краем дороги, по всей длине участка', () => {
        let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const p = planAccents('promzona', 60, r);
        expect(p.length).toBe(ZONE_ACCENTS.promzona.n);
        p.forEach((it) => { expect(it.off).toBeGreaterThan(0.3); expect(it.dz).toBeGreaterThanOrEqual(0); expect(it.dz).toBeLessThanOrEqual(60); });
    });
    it('мачты мигают, неон в основном горит', () => {
        const on = [0, 0.1, 0.3].map((t) => blinkLevel('blink', t, 0));
        expect(on).toEqual([1, 1, 1]);
        expect(blinkLevel('blink', 0.8, 0)).toBeLessThan(0.5);
        expect(blinkLevel('neon', 1, 0)).toBe(1);
    });
});
