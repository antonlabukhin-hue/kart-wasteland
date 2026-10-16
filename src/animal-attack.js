/**
 * Пустошь: звери не просто перебегают — они нападают. У зверя одна из ролей (по виду и случаю):
 *   lunge  — волк (собака), лиса, кот, лев, обезьяна: выскакивает с обочины в полосу машины, приседает и прыгает на неё
 *            (в прыжке чуть доворачивает — уйти в соседнюю полосу успеваешь); долетел — вцепляется в капот (src/hood-latch.js);
 *   charge — кабан, носорог, олень, зебра: выбегает в полосу машины и мчится ей навстречу — уходи в другую полосу;
 *   block  — медведь, слон, бегемот, крокодил: выходит на дорогу и встаёт в полосе на дыбы — объезжай;
 *   cross  — как раньше, перебегает дорогу (но ближе к машине, чем было).
 * Выбегают ближе к машине, чем раньше: из-за обочины, а не издалека.
 *
 * prepAttack(a, r, base) — роль и дальность, на которой зверь выскочит (при создании),
 * stepAttack(a, dt, pz, px) — движение после выхода (true — шаг сделан здесь, false — обычная перебежка src/animals.js).
 * Увернулся от прыжка или тарана — a.dodged = 'new' (src/modes/infinite-run.js показывает «Увернулся!»).
 */
export const LUNGE = ['DOG', 'FOX', 'CAT', 'LION', 'MONKEY'];
export const CHARGE = ['BOAR', 'RHINO', 'DEER', 'ZEBRA', 'DINO'];
export const BLOCK = ['BEAR', 'ELEPHANT', 'HIPPO', 'CROC', 'GIRAFFE'];
/** Доля нападающих среди зверей своей группы (остальные — просто перебегают) */
export const ATTACK_SHARE = 0.7;
/** На какой дальности (× порог перебежки) выскакивает зверь каждой роли */
export const TRIG_K = { lunge: 1.3, charge: 1.9, block: 1.6, cross: 0.85 };
export const LANES = [-2, 0, 2];

/** Роль зверя: по виду и случаю r() */
export function pickRole(species, r) {
    const g = LUNGE.indexOf(species) >= 0 ? 'lunge' : CHARGE.indexOf(species) >= 0 ? 'charge' : BLOCK.indexOf(species) >= 0 ? 'block' : 'cross';
    return g !== 'cross' && r() < ATTACK_SHARE ? g : 'cross';
}

/** Ближайшая полоса к x */
export function laneNear(x) {
    let best = LANES[0];
    LANES.forEach(function(l) { if (Math.abs(l - x) < Math.abs(best - x)) best = l; });
    return best;
}

/** При создании зверя: роль и дальность выхода (base — порог перебежки спавнера, ед.) */
export function prepAttack(a, r, base) {
    a.role = pickRole(a.speciesKey, r);
    a._trigDist = (base || 15) * TRIG_K[a.role] * (0.9 + r() * 0.2);
    a.phase = null; a.pt = 0;
    return a;
}

/** Фазы, с) */
export const RUN_IN = 0.4, CROUCH = 0.28, LEAP = 0.85, LEAP_VZ = 5, LEAP_TURN = 1.4, CHARGE_VZ = 7.5, BLOCK_IN = 0.75;

const ease = function(t) { return t * t * (3 - 2 * t); };
function legs(a, cycle) {
    if (!a.mesh || !a.mesh.traverse) return;
    a.mesh.traverse(function(o) {
        if (!o.userData || !o.userData.isLeg) return;
        const idx = o.userData.legIndex | 0, ph = (idx === 0 || idx === 3) ? 0 : Math.PI;
        o.rotation.x = Math.sin(cycle + ph) * 0.6;
    });
}

/**
 * Шаг нападения после выхода зверя на дорогу. pz, px — машина игрока (едет к −z; зверь впереди — z меньше).
 * Возвращает true, если зверя двигал этот модуль.
 */
export function stepAttack(a, dt, pz, px) {
    if (!a.role || a.role === 'cross') return false;
    const m = a.mesh;
    if (!a.phase) { a.phase = 'run'; a.pt = 0; a.x0 = a.x; a.tx = a.role === 'block' ? LANES[Math.floor(Math.abs(Math.sin(a.z * 12.9898)) * 3) % 3] : laneNear(px); }
    a.pt += dt;
    const face = function(dir) { m.rotation.y = dir; };
    if (a.phase === 'run') { // с обочины — в полосу
        const dur = a.role === 'block' ? BLOCK_IN : RUN_IN, t = Math.min(1, a.pt / dur);
        a.x = a.x0 + (a.tx - a.x0) * ease(t);
        face(a.tx > a.x0 ? Math.PI / 2 : -Math.PI / 2);
        m.position.y = Math.abs(Math.sin(a.pt * 18)) * 0.08;
        legs(a, a.pt * 18);
        if (t >= 1) { a.phase = a.role === 'lunge' ? 'crouch' : a.role === 'charge' ? 'charge' : 'stand'; a.pt = 0; }
    } else if (a.phase === 'crouch') { // присел — сейчас прыгнет
        face(0); m.position.y = 0; m.rotation.x = 0.25;
        if (a.pt >= CROUCH) { a.phase = 'leap'; a.pt = 0; m.rotation.x = 0; }
    } else if (a.phase === 'leap') { // прыжок навстречу машине, чуть доворачивает
        const t = Math.min(1, a.pt / LEAP);
        a.z += LEAP_VZ * dt;
        const dx = px - a.x, turn = LEAP_TURN * dt;
        a.x += Math.max(-turn, Math.min(turn, dx));
        m.position.y = Math.sin(t * Math.PI) * 0.75;
        m.rotation.x = -0.5 + t * 0.9;
        face(0);
        if (t >= 1) { a.phase = 'land'; a.pt = 0; m.rotation.x = 0; m.position.y = 0; }
    } else if (a.phase === 'land' || a.phase === 'charge') { // бежит навстречу
        a.z += (a.phase === 'charge' ? CHARGE_VZ : 2.5) * dt;
        face(0);
        m.position.y = Math.abs(Math.sin(a.pt * 16)) * 0.1;
        m.rotation.x = Math.sin(a.pt * 8) * 0.06;
        legs(a, a.pt * 16);
    } else if (a.phase === 'stand') { // встал на дыбы в полосе
        face(0);
        m.rotation.x = -0.22 - Math.sin(a.pt * 3) * 0.06;
        m.position.y = 0;
    }
    m.position.x = a.x; m.position.z = a.z;
    // проскочил мимо нападающего — увернулся
    if (!a.hit && !a.dodged && (a.phase === 'leap' || a.phase === 'land' || a.phase === 'charge') && a.z > pz + 1.5 && Math.abs(a.x - px) < 3.2) a.dodged = 'new';
    return true;
}
