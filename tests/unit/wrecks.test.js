import { describe, it, expect } from 'vitest';
import { burnHex, wreckPose, wreckHit, wreckCount, WRECK_KINDS, BTR_HIT } from '../../src/wrecks.js';
import { sickRgb } from '../../src/zombie-look.js';

const ch = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const sat = (h) => { const c = ch(h); return Math.max(...c) - Math.min(...c); };
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('Пустошь: обломки на трассе', () => {
    it('краска после пожара — серее и темнее исходной, стекло и фары — в сажу', () => {
        for (const h of [0x3366ff, 0xff6600, 0xffff00, 0x33cc33, 0xcc00ff]) {
            for (const r of [0.1, 0.5, 0.9]) {
                const b = burnHex(h, r);
                expect(sat(b)).toBeLessThan(sat(h));
                expect(ch(b).reduce((a, v) => a + v, 0)).toBeLessThan(ch(h).reduce((a, v) => a + v, 0));
            }
        }
        expect(burnHex(0x1c2a36, 0.5)).toBe(0x1e1a18); // стекло
        expect(burnHex(0xff1a10, 0.5)).toBe(0x1e1a18); // стоп-сигнал
        expect(burnHex(0xfffbe6, 0.5)).toBe(0x1e1a18); // фара
    });

    it('поза: высокие (автобус, грузовик, БТР) на бок не ложатся, поворот небольшой — обломок в своей полосе', () => {
        for (let i = 0; i < 200; i++) {
            const r = Math.random;
            for (const k of ['bus', 'truck', 'btr']) {
                const p = wreckPose(k, r);
                expect(Math.abs(Math.abs(p.roll) - Math.PI / 2)).toBeGreaterThan(0.1);
            }
            const p = wreckPose('sedan', r);
            expect(Math.abs(p.yaw)).toBeLessThanOrEqual(0.4);
            if (p.fire) expect(p.smoke).toBe(true); // горит — значит и дымит
        }
        expect(wreckPose('btr', seq([0.1, 0.5, 0.5])).roll).toBe(0); // БТР — всегда на колёсах
        expect(wreckPose('sedan', seq([0.1, 0.5, 0.5])).roll).toBe(Math.PI); // на крыше
    });

    it('развёрнутый обломок шире, но не шире полосы (одна полоса всегда свободна)', () => {
        const straight = wreckHit(0.8, 1.45, { yaw: 0, roll: 0 });
        const turned = wreckHit(0.8, 1.45, { yaw: 0.4, roll: 0 });
        expect(straight).toEqual([0.8, 1.45]);
        expect(turned[0]).toBeGreaterThan(straight[0]);
        expect(wreckHit(1.0, 2.6, { yaw: 0.4, roll: 0 })[0]).toBeLessThanOrEqual(1.9);
        expect(BTR_HIT[1]).toBeGreaterThan(BTR_HIT[0]);
    });

    it('обломков с ростом сложности больше; виды — без мотоциклов, есть БТР', () => {
        expect(wreckCount(0)).toBe(2);
        expect(wreckCount(4)).toBe(10);
        expect(WRECK_KINDS).toContain('btr');
        expect(WRECK_KINDS).not.toContain('moto');
    });
});

describe('Пустошь: бешеные звери', () => {
    it('шкура выцветает и уходит в болотную зелень', () => {
        const fox = sickRgb(220, 120, 40);
        expect(Math.max(...fox) - Math.min(...fox)).toBeLessThan(180);
        expect(fox[1]).toBeGreaterThanOrEqual(fox[2]); // зелени больше, чем синего
        const white = sickRgb(255, 255, 255);
        expect(white[0]).toBeLessThan(255);
        expect(sickRgb(0, 0, 0).every((v) => v >= 0)).toBe(true);
    });
});
