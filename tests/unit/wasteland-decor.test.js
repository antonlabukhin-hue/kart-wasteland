import { describe, it, expect } from 'vitest';
import { planWaste, wasteX, isStaticWaste, SIDE_EVERY, LANDMARK_EVERY } from '../../src/wasteland-decor.js';

let s = 11;
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

describe('Пустошь: отголоски апокалипсиса вдоль дороги', () => {
    it('на километре — много придорожного, несколько ориентиров и столбов дыма, трещины на асфальте; всё по порядку', () => {
        const p = planWaste(0, 1000, rnd);
        const n = (k) => p.filter((it) => it.kind === k).length;
        expect(p.filter((it) => it.side && it.off < 6).length).toBeGreaterThan(1000 / SIDE_EVERY[1] - 2);
        expect(n('plane') + n('btr') + n('bus')).toBeGreaterThanOrEqual(1);
        expect(n('plume')).toBeGreaterThan(5);
        expect(n('crack') + n('scorch')).toBeGreaterThan(50);
        for (let i = 1; i < p.length; i++) expect(p[i].d).toBeGreaterThanOrEqual(p[i - 1].d);
        p.forEach((it) => { expect(it.d).toBeGreaterThanOrEqual(0); expect(it.d).toBeLessThan(1000); });
        expect(LANDMARK_EVERY[0]).toBeGreaterThan(SIDE_EVERY[1]);
    });
    it('на полосах — только трещины и гарь (их не надо объезжать), остальное — за краем дороги', () => {
        const W = 6;
        planWaste(0, 3000, rnd).forEach((it) => {
            const x = wasteX(it, W);
            if (it.kind === 'crack' || it.kind === 'scorch') expect(Math.abs(x)).toBeLessThanOrEqual(W / 2);
            else expect(Math.abs(x)).toBeGreaterThan(W / 2 + 1);
        });
        expect(isStaticWaste('crater')).toBe(true);
        expect(isStaticWaste('shell')).toBe(false); // над ним дым — спрайты
    });
});

import { shuffleLayout, resolveLayout, validateLayout } from '../../src/track-layout.js';
describe('Пустошь: каждый заезд — своя раскладка', () => {
    it('разломы и участки сдвигаются, раскладка остаётся правильной', () => {
        const base = resolveLayout(null, { mapId: 'arsenev', difficulty: 'easy' });
        const seen = new Set();
        for (let i = 0; i < 20; i++) {
            const l = shuffleLayout(base, Math.random);
            expect(validateLayout(l)).toEqual([]);
            seen.add(JSON.stringify(l.gaps) + l.event);
        }
        expect(seen.size).toBeGreaterThan(10);
    });
});
