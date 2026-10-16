import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { WRECK_MODELS } from '../../src/wreck-models.js';
import { WRECK_KINDS, wreckPose } from '../../src/wrecks.js';
import { hopClears } from '../../src/traffic-cars.js';

describe('Пустошь: танк, самолёт, вертолёт, бензовоз, трактор на дороге', () => {
    const r = () => 0.5;
    Object.keys(WRECK_MODELS).forEach((kind) => {
        it(kind + ': на трассе, в своей полосе, на асфальте', () => {
            expect(WRECK_KINDS).toContain(kind);
            const m = WRECK_MODELS[kind](r);
            const b = new THREE.Box3().setFromObject(m.group);
            expect(Math.max(-b.min.x, b.max.x)).toBeLessThanOrEqual(0.75); // полоса ±1: соседняя свободна
            expect(b.min.y).toBeGreaterThan(-0.05);
            expect(m.hitW).toBeLessThanOrEqual(1.1);
            expect(m.hitL).toBeGreaterThan(1.5);
            expect(b.max.z - b.min.z).toBeLessThanOrEqual(m.hitL + 0.6);
            expect(wreckPose(kind, r).roll).toBe(0); // не на боку — встал бы стеной
        });
    });
    it('высокие с места не перепрыгнуть, танк и самолёт — можно', () => {
        ['heli', 'tanker', 'tractor'].forEach((k) => expect(hopClears(k, 1.2)).toBe(false));
        ['tank', 'plane'].forEach((k) => expect(hopClears(k, 1.2)).toBe(true));
    });
});
