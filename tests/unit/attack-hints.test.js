import { describe, it, expect } from 'vitest';
import { hintDue, ATTACK_HINTS } from '../../src/attack-hints.js';

describe('Пустошь: подсказка при первой встрече с нападением', () => {
    it('у каждого нападения — своя подсказка, перебежка без неё, знакомое — не повторяется', () => {
        ['lunge', 'charge', 'block', 'giant'].forEach((r) => { expect(hintDue(r, new Set())).toBe(ATTACK_HINTS[r]); expect(ATTACK_HINTS[r].text.length).toBeGreaterThan(20); });
        expect(hintDue('cross', new Set())).toBe(null);
        expect(hintDue('lunge', new Set(['lunge']))).toBe(null);
    });
});
