import { describe, it, expect } from 'vitest';
import { ruinRgb, blot } from '../../src/ruin.js';

const sat = (c) => Math.max(...c) - Math.min(...c);
const lum = (c) => c[0] + c[1] + c[2];

describe('Пустошь: пейзаж после катастрофы', () => {
    it('листва мёртвая — не зелёная', () => {
        for (const n of [0.1, 0.5, 0.9]) {
            const c = ruinRgb(60, 150, 50, n, 1);
            expect(c[1]).toBeLessThan(150);
            expect(c[1] - c[0]).toBeLessThan(40);
        }
    });
    it('стекло выбито — тёмное; стены выцветшие и темнее, выше — больше копоти', () => {
        expect(lum(ruinRgb(150, 190, 230, 0.5, 3))).toBeLessThan(150);
        const wall = [200, 120, 80];
        const w = ruinRgb(...wall, 0.4, 0.5);
        expect(sat(w)).toBeLessThan(sat(wall));
        expect(lum(w)).toBeLessThan(lum(wall));
        expect(lum(ruinRgb(...wall, 0.4, 3))).toBeLessThan(lum(w)); // наверху копоть
        ruinRgb(255, 255, 255, 0.99, 9).forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(255); });
    });
    it('пятна крупные: соседние точки — одно пятно', () => {
        expect(blot(1.1, 0.5, 1.1)).toBe(blot(1.2, 0.6, 1.25));
        const b = blot(3, 4, 5); expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(1);
    });
});
