import { describe, it, expect } from 'vitest';
import { recordBeast, bestiaryRows, bestiaryCount, ORDER, TRAITS, EMOJI } from '../../src/bestiary.js';
import { bestiaryHtml } from '../../src/ui/bestiary-screen.js';

describe('Пустошь: бестиарий — звери, которых встретил', () => {
    it('у каждого зверя есть значок и характер', () => {
        ORDER.forEach((sp) => { expect(EMOJI[sp], sp).toBeTruthy(); expect(TRAITS[sp].length, sp).toBeGreaterThan(20); });
    });
    it('невстреченный — «???», встретил — имя, повадка, гудок и счётчики', () => {
        const p = {};
        expect(bestiaryCount(p)).toBe(0);
        expect(bestiaryRows(p)[0].name).toBe('???');
        recordBeast(p, 'BOAR', 'met'); recordBeast(p, 'BOAR', 'dodged'); recordBeast(p, 'NOPE', 'met');
        const boar = bestiaryRows(p).find((r) => r.sp === 'BOAR');
        expect(boar.open).toBe(true); expect(boar.name).toContain('Кабан');
        expect(boar.how).toContain('таран'); expect(boar.horn).toContain('убегает'); expect(boar.dodged).toBe(1);
        expect(bestiaryCount(p)).toBe(1);
        const html = bestiaryHtml(p);
        expect(html).toContain('встречено 1 из ' + ORDER.length); expect(html).toContain('???');
    });
});
