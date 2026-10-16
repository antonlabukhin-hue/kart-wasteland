import { describe, it, expect } from 'vitest';
import { BEASTS } from '../../src/beast-kit.js';
import { BEAST_MODELS } from '../../src/beast-models.js';
import { ANIMAL_TYPES } from '../../src/data.js';
import { LUNGE, CHARGE, BLOCK } from '../../src/animal-attack.js';

describe('Пустошь: у каждого зверя своё лицо', () => {
    it('все нападающие виды — со своей моделью, окрасом и мутацией', () => {
        LUNGE.concat(CHARGE, BLOCK).forEach((k) => {
            expect(BEASTS[k], k).toBeTruthy();
            expect(BEASTS[k].f.length, k).toBeGreaterThan(0);
            expect(BEAST_MODELS, k).toContain(k);
        });
    });
    it('окрасы и цвет глаз у видов разные (не один болотный на всех)', () => {
        const tints = new Set(Object.values(BEASTS).map((b) => b.tint));
        expect(tints.size).toBe(Object.keys(BEASTS).length);
        expect(new Set(Object.values(BEASTS).map((b) => b.eye)).size).toBeGreaterThan(4);
    });
    it('в надписях — имена мутантов', () => {
        expect(ANIMAL_TYPES.DOG.name).toBe('Волк-падальщик');
        expect(ANIMAL_TYPES.ELEPHANT.name).toBe('Мамонт пустоши');
        Object.keys(BEASTS).forEach((k) => expect(ANIMAL_TYPES[k].name).toBe(BEASTS[k].name));
    });
});

import { GLOW_MAX, GLOW_OPACITY } from '../../src/beast-kit.js';
describe('Пустошь: свечение зверя не закрывает его', () => {
    it('ореолы маленькие и полупрозрачные', () => {
        expect(GLOW_MAX).toBeLessThanOrEqual(0.2);
        expect(GLOW_OPACITY).toBeLessThan(0.6);
    });
});

import * as THREE from 'three';
import { buildBeast, BEAST_MODELS } from '../../src/beast-models.js';
describe('Пустошь: глаза зверя не раздуваются', () => {
    it('глаз — маленький шарик с масштабом 1 (спавнер сбрасывает масштаб глаз на 1)', () => {
        globalThis.document = globalThis.document || {};
        BEAST_MODELS.forEach((k) => {
            const m = buildBeast(k); if (!m) return;
            m.traverse((o) => {
                if (!o.userData.isEye) return;
                o.scale.setScalar(1.6); // как ночью в src/animals.js
                const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
                expect(Math.max(s.x, s.y, s.z), k).toBeLessThan(0.12);
            });
        });
    });
});
