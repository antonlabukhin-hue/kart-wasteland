import { describe, it, expect } from 'vitest';
import { causeInfo, runGoal, runGoalHtml, TIPS } from '../../src/run-goal.js';

const NAMES = { BEAR: 'Медведь', CHICKEN: 'Курица' };

describe('одна цель на итогах', () => {
    it('причина — по-человечески и с классом угрозы', () => {
        expect(causeInfo('car:bus')).toMatchObject({ name: 'автобус', cls: 'car', icon: '🚌' });
        expect(causeInfo('car:tank').name).toBe('танк');
        expect(causeInfo('BEAR', NAMES)).toMatchObject({ name: 'медведь', cls: 'threat' });
        expect(causeInfo('BEAR', NAMES, 'giant')).toMatchObject({ cls: 'a_giant', how: 'гигант навстречу' });
        expect(causeInfo('pipe').cls).toBe('jump');
        expect(causeInfo('barrier').cls).toBe('duck');
        expect(causeInfo('gap').cls).toBe('gap');
        Object.values({ a: causeInfo('car:x'), b: causeInfo('BEAR'), c: causeInfo('pipe'), d: causeInfo('gap'), e: causeInfo('ремонт'), f: causeInfo('zzz') })
            .forEach(ci => expect(TIPS[ci.cls], ci.cls).toBeTruthy());
    });

    it('от чего погиб: кто и как, цель из «почти» и совет против именно этого', () => {
        const g = runGoal({ dist: 1234, best: 1400, crashes: [{ cause: 'BOAR', role: 'charge', dist: 1234 }], animalNames: { BOAR: 'Кабан-таран' }, near: [{ icon: '🏆', text: 'До рекорда не хватило 166 м' }] });
        expect(g.why).toBe('💀 Погиб: кабан-таран — таран, ' + (1234).toLocaleString('ru-RU') + ' м');
        expect(g.goal).toBe('🎯 До рекорда не хватило 166 м');
        expect(g.tip).toContain('Топот');
        expect(g.hits).toEqual([]); // один удар — журнал не нужен
    });

    it('журнал ударов за заезд — по порядку, со значком, видом нападения и метром', () => {
        const g = runGoal({ dist: 900, crashes: [{ cause: 'DOG', role: 'lunge', dist: 300 }, { cause: 'car:tank', dist: 500 }, { cause: 'BEAR', role: 'giant', dist: 900 }], animalNames: { DOG: 'Волк', BEAR: 'Медведь' }, animalIcons: { DOG: '🐺', BEAR: '🐻' } });
        expect(g.hits.map((h) => h.icon)).toEqual(['🐺', '🪖', '🐻']);
        expect(g.hits[0].text).toBe('волк — прыжок на капот · 300 м');
        expect(g.why).toContain('медведь — гигант навстречу');
        expect(g.tip).toContain('гиганта');
        const many = runGoal({ dist: 1, crashes: Array.from({ length: 9 }, (_, i) => ({ cause: 'car:sedan', dist: i })) });
        expect(many.hits.length).toBe(6);
    });

    it('без «почти» — цель чуть дальше рекорда; новый рекорд — следующая веха', () => {
        expect(runGoal({ dist: 500, best: 1210, crashes: [] }).goal).toBe('🎯 Цель — ' + (1400).toLocaleString('ru-RU') + ' м');
        expect(runGoal({ dist: 2000, best: 1000, isNew: true, crashes: [] }).goal).toContain('Новый рекорд');
        expect(runGoal({ dist: 500, crashes: [] }).tip).toBe('');
    });

    it('разметка экранирует текст', () => {
        expect(runGoalHtml({ why: '<b>', goal: 'x', tip: '' })).toContain('&lt;b&gt;');
        expect(runGoalHtml({ why: 'a', hits: [{ icon: '🐺', text: '<i>' }], goal: 'x', tip: '' })).toContain('g-hit');
    });
});
