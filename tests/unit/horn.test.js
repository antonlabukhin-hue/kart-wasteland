import { describe, it, expect } from 'vitest';
import { hornReact, applyHorn, createHorn, HORN_CD, HORN_RANGE, FREEZE_T } from '../../src/horn.js';
import { stepAttack } from '../../src/animal-attack.js';

const mesh = () => ({ visible: true, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { multiplyScalar() {} }, traverse() {} });
const beast = (sp, o) => Object.assign({ speciesKey: sp, x: 4.5, z: -30, mesh: mesh(), role: 'lunge' }, o || {});

describe('Пустошь: гудок — каждый зверь реагирует по-своему', () => {
    it('одно правило: гудок спугивает любого зверя, кроме гиганта', () => {
        ['DOG', 'BOAR', 'BEAR', 'DEER', 'HIPPO'].forEach((sp) => expect(hornReact(beast(sp)), sp).toBe('flee'));
        expect(hornReact(beast('BEAR', { giant: true }))).toBe('ignore');
        expect(hornReact(beast('DOG', { phase: 'leap' }))).toBe(null); // в прыжке уже не спугнуть
    });
    it('спугнутый убегает с дороги и не бьёт; злой пропускает подготовку; медведь вместо стойки бежит навстречу', () => {
        const w = applyHorn(beast('DOG', { x: -2 }), 'flee');
        expect(w.fled).toBe(true); expect(w.phase).toBe('leave');
        const x0 = w.x; for (let i = 0; i < 30; i++) stepAttack(w, 1 / 60, 0, 0);
        expect(w.x).toBeLessThan(x0); // убегает к своей обочине
        const b = applyHorn(beast('BOAR', { role: 'charge', phase: 'prep', pt: 0.1, triggered: true }), 'anger');
        stepAttack(b, 1 / 60, 0, 0); expect(b.phase).toBe('charge');
        const bear = applyHorn(beast('BEAR', { role: 'block', phase: 'stand', triggered: true }), 'anger');
        expect(bear.role).toBe('charge'); expect(bear.phase).toBe('charge');
    });
    it('олень стоит FREEZE_T, потом уходит', () => {
        const d = applyHorn(beast('DEER', { role: 'cross', x: 0 }), 'freeze');
        for (let i = 0; i < Math.round(FREEZE_T * 60) - 2; i++) stepAttack(d, 1 / 60, 0, 0);
        expect(d.phase).toBe('freeze');
        for (let i = 0; i < 10; i++) stepAttack(d, 1 / 60, 0, 0);
        expect(d.phase).toBe('leave');
    });
    it('перезарядка; слышат только звери впереди в радиусе; кнопка светится, когда есть кого пугать', () => {
        const near = beast('DOG', { z: -20, told: true }), boar = beast('BOAR', { z: -40, role: 'charge', told: true }), far = beast('DOG', { z: -(HORN_RANGE + 10) }), giant = beast('BEAR', { z: -30, giant: true, role: 'charge', told: true });
        const said = [];
        const h = createHorn({ animals: () => [near, boar, far, giant], z: () => 0, popup: (t) => said.push(t) });
        expect(h.state().k).toBe(1);
        expect(h.fire()).toBe(true);
        expect(near.fled).toBe(true); expect(boar.fled).toBe(true); expect(far.fled).toBeUndefined(); expect(giant.fled).toBeUndefined();
        expect(said[0]).toContain('Спугнул');
        expect(h.fire()).toBe(false); expect(h.state().k).toBe(0);
        h.tick(HORN_CD); expect(h.state().ready).toBe(true);
        const empty = []; createHorn({ animals: () => [], z: () => 0, popup: (t) => empty.push(t) }).fire();
        expect(empty[0]).toContain('никого');
    });
});
