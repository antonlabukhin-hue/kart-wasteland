/**
 * Пустошь: встречи со зверями — не случайный спавн, а сценки, которые запоминаются («проиграл на кабанах у автобуса»).
 * Каждые SCENE_EVERY м — сцена по пейзажу: реквизит у обочины (сгоревший автобус, баррикада, ядовитая лужа, гора шин…)
 * и звери, которые там живут. Звери ведут себя как обычно (src/animal-attack.js): пасутся → настораживаются → готовятся → нападают;
 * нападение закрыто по метрам (ROLE_FROM) — тогда зверь в сцене просто перебегает.
 *   стая волков вдоль дороги, кабаны роются у сгоревшего автобуса, медведь у баррикады, олени перебегают у сухих деревьев,
 *   крокодил у ядовитой лужи, носорог у разбитого БТР, обезьяны на горе шин, бегемот в луже.
 * planScene(themeId, r) — чистая (тест); ставит сцену src/modes/infinite-run.js.
 */
export const SCENE_FROM = 450, SCENE_EVERY = [450, 650];

export const SCENES = {
    pack: { prop: null, sp: 'DOG', role: 'lunge', dz: [0, 10, 20] },
    boars: { prop: 'bus', sp: 'BOAR', role: 'charge', dz: [0, 7] },
    bear: { prop: 'barricade', sp: 'BEAR', role: 'block', dz: [0] },
    deer: { prop: 'deadtree', sp: 'DEER', role: 'cross', dz: [0, 5, 10] },
    croc: { prop: 'pool', sp: 'CROC', role: 'block', dz: [0] },
    rhino: { prop: 'btr', sp: 'RHINO', role: 'charge', dz: [0] },
    monkeys: { prop: 'tires', sp: 'MONKEY', role: 'lunge', dz: [0, 8] },
    hippo: { prop: 'pool', sp: 'HIPPO', role: 'block', dz: [0] }
};
/** Какие сцены в каком пейзаже (экосистема зоны) */
export const ZONE_SCENES = {
    day: ['pack', 'boars', 'bear'], village: ['boars', 'pack', 'deer'], promzona: ['croc', 'rhino', 'pack'],
    snow: ['bear', 'deer', 'pack'], city: ['pack', 'monkeys'], night: ['pack', 'bear', 'boars'],
    svalka: ['monkeys', 'hippo'], rain: ['croc', 'pack', 'deer'], jungle: ['monkeys', 'croc', 'rhino']
};

/** Сцена для пейзажа: { kind, prop, side (−1|1), beasts: [{ sp, role, dz, off }] }; last — прошлая (не повторять подряд) */
export function planScene(themeId, r, last) {
    const list = ZONE_SCENES[themeId] || ZONE_SCENES.day;
    let kinds = list.filter(function(k) { return k !== last; });
    if (!kinds.length) kinds = list;
    const kind = kinds[Math.floor(r() * kinds.length)], def = SCENES[kind], side = r() < 0.5 ? -1 : 1;
    return {
        kind: kind, prop: def.prop, side: side,
        beasts: def.dz.map(function(dz) { return { sp: def.sp, role: def.role, dz: dz, off: 3 + r() * 2.5 }; })
    };
}
