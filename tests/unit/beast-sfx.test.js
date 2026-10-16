import { describe, it, expect } from 'vitest';
import { warnSfx, BEAST_SFX } from '../../src/beast-sfx.js';

describe('Пустошь: звери предупреждают голосом', () => {
    it('у каждого вида нападения свой звук-предупреждение, перебежка — без звука', () => {
        const names = ['lunge', 'charge', 'block', 'giant'].map(warnSfx);
        expect(new Set(names).size).toBe(4);
        names.forEach((n) => expect(n.startsWith('beast_')).toBe(true));
        expect(warnSfx('cross')).toBe(null);
        expect(Object.keys(BEAST_SFX).length).toBe(4);
    });
});
