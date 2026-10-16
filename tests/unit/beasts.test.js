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
