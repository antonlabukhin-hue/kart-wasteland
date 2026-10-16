import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { auraLevel, hullK, addOutline, setAura, OUTLINE_W, AURA_COLOR } from '../../src/beast-outline.js';
import { warnSfx, BEAST_SFX } from '../../src/beast-sfx.js';

describe('Пустошь: зверь заметнее декораций', () => {
    it('аура: перед броском пульсирует, в броске горит, у перебегающего и сбитого — нет', () => {
        expect(auraLevel({ role: 'lunge' }, 0)).toBe(0);                     // ещё не заметил
        const tell = [0, 0.05, 0.1].map((t) => auraLevel({ role: 'lunge', told: true }, t));
        tell.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0.1); expect(v).toBeLessThanOrEqual(1); });
        expect(auraLevel({ role: 'charge', triggered: true, phase: 'charge' }, 0)).toBe(1);
        expect(auraLevel({ role: 'cross', told: true, triggered: true }, 0)).toBe(0);
        expect(auraLevel({ role: 'lunge', triggered: true, phase: 'leap', hit: true }, 0)).toBe(0);
        expect(auraLevel({ role: 'lunge', triggered: true, phase: 'land', dodged: 'done' }, 0)).toBe(0);
    });
    it('контур одной толщины у крупных и мелких деталей', () => {
        // единичная сфера (полуразмер 1) в масштабе 0.5 и 2: прибавка в мире = OUTLINE_W
        [0.5, 2].forEach((s) => expect(s * 1 * (hullK(1, s) - 1)).toBeCloseTo(OUTLINE_W, 6));
        expect(hullK(0, 1)).toBe(1);
    });
    it('оболочки — на деталях, не на глазах; повторно не добавляются; аура красит контур', () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)); body.scale.set(1.2, 0.6, 2); g.add(body);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05)); eye.userData.isEye = true; g.add(eye);
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02)); g.add(tooth);
        const mat = addOutline(g);
        expect(addOutline(g)).toBe(mat);
        expect(body.children.length).toBe(1);
        expect(eye.children.length).toBe(0);
        expect(tooth.children.length).toBe(0);
        expect(body.children[0].material.side).toBe(THREE.BackSide);
        setAura(g, 1); expect(mat.color.getHex()).toBe(AURA_COLOR);
        setAura(g, 0); expect(mat.color.getHex()).toBe(0);
    });
    it('у каждого вида нападения свой звук-предупреждение, перебежка — без звука', () => {
        const names = ['lunge', 'charge', 'block', 'giant'].map(warnSfx);
        expect(new Set(names).size).toBe(4);
        names.forEach((n) => expect(n.startsWith('beast_')).toBe(true));
        expect(warnSfx('cross')).toBe(null);
        expect(Object.keys(BEAST_SFX).length).toBe(4);
    });
});
