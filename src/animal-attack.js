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
import { signatureOf, prepTime, poseSignature } from './beast-behavior.js';
import { FREEZE_T, ANGRY_K } from './horn.js';

export const LUNGE = ['DOG', 'FOX', 'CAT', 'LION', 'MONKEY'];
export const CHARGE = ['BOAR', 'RHINO', 'DEER', 'ZEBRA', 'DINO'];
export const BLOCK = ['BEAR', 'ELEPHANT', 'HIPPO', 'CROC', 'GIRAFFE'];
/** Гиганты: мамонт, носорог, бегемот, медведь, ящер — бывает, вырастают в 2.4 раза и несутся по полосе, как сорвавшийся грузовик (удар — целое сердце) */
export const GIANT = ['ELEPHANT', 'RHINO', 'HIPPO', 'BEAR', 'DINO'];
export const GIANT_SHARE = 0.4, GIANT_SCALE = 2.0, GIANT_VZ = 11;
/**
 * Наибольший радиус удара зверя, ед. Полосы — через 2 ед., к радиусу при проверке прибавляется 0.45 (полмашины):
 * с радиусом больше ~1.15 зверь задевал машину и в соседней полосе — бегемота-гиганта (было 1.25 × 1.9 ≈ 2.5) нельзя было объехать.
 * Гигант — во всю свою полосу, но не дальше.
 */
export const HIT_R_MAX = 1.1;
/** Доля нападающих среди зверей своей группы (остальные — просто перебегают) */
export const ATTACK_SHARE = 0.7;
/** На какой дальности (× порог перебежки) выскакивает зверь каждой роли */
// Пустошь (этап «звери-персонажи»): у нападения появилась подготовка (src/beast-behavior.js, 0.5–0.9 с) — выходят раньше,
// чтобы подпись вида (кабан скребёт землю, медведь встаёт на дыбы…) успела показаться до того, как машина подъедет
export const TRIG_K = { lunge: 2.4, charge: 3.2, block: 3.0, cross: 0.85, giant: 4.0 };
export const LANES = [-2, 0, 2];

/**
 * Обучающий отрезок: с какого метра заезда появляется каждое нападение (раньше — всё сразу со старта, новичок погибал за 20–30 с).
 * До 400 м — только обломки и перебежки; прыгун — с 400, таран — с 700, «встал в полосе» — с 900, гиганты — с 1200.
 */
export const ROLE_FROM = { cross: 0, lunge: 400, charge: 700, block: 900, giant: 1200 };
/** Открыто ли нападение role на метре dist (dist не задан — всё открыто) */
export function roleOpen(role, dist) { return dist == null || dist >= (ROLE_FROM[role] || 0); }

/** Роль зверя: по виду и случаю r(); dist — метр заезда (закрытые нападения — перебежка) */
export function pickRole(species, r, dist) {
    if (GIANT.indexOf(species) >= 0 && r() < GIANT_SHARE && roleOpen('giant', dist)) return 'giant';
    const g = LUNGE.indexOf(species) >= 0 ? 'lunge' : CHARGE.indexOf(species) >= 0 ? 'charge' : BLOCK.indexOf(species) >= 0 ? 'block' : 'cross';
    return g !== 'cross' && r() < ATTACK_SHARE && roleOpen(g, dist) ? g : 'cross';
}

/** Ближайшая полоса к x */
export function laneNear(x) {
    let best = LANES[0];
    LANES.forEach(function(l) { if (Math.abs(l - x) < Math.abs(best - x)) best = l; });
    return best;
}

/** При создании зверя: роль и дальность выхода (base — порог перебежки спавнера, ед.; dist — метр заезда) */
export function prepAttack(a, r, base, dist) {
    a.role = pickRole(a.speciesKey, r, dist);
    a._trigDist = (base || 15) * TRIG_K[a.role] * (0.9 + r() * 0.2);
    a.phase = null; a.pt = 0;
    a.radius = Math.min(a.radius || 0.5, HIT_R_MAX); // крупный зверь бьёт только в своей полосе — соседняя безопасна
    if (a.role === 'giant') { // гигант: крупнее, удар — целое сердце, во всю свою полосу
        a.giant = true;
        if (a.mesh && a.mesh.scale) { if (a.mesh.scale.setScalar) a.mesh.scale.setScalar(GIANT_SCALE); else a.mesh.scale.multiplyScalar(GIANT_SCALE); }
        a.radius = HIT_R_MAX;
    }
    return a;
}

/**
 * На каком расстоянии впереди (ед.) зверь должен появиться, чтобы до выхода успеть его увидеть и услышать:
 * порог выхода (trigDist × k — множитель скорости спавнера) + путь за tell секунд (v — скорость, ед./с) + запас.
 * Спавнер ставит зверей на ~1.5 порога перебежки, а прыгун выходит с 1.3, таран — с 1.9, гигант — с 3.4:
 * они срабатывали сразу при появлении, и предупреждения (src/animals.js TELL_S) не было.
 */
export function attackLead(trigDist, k, v, tell) { return trigDist * (k || 1) + (v || 0) * (tell || 0) + 4; }

/** Фазы, с) */
export const RUN_IN = 0.4, CROUCH = 0.28, LEAP = 0.85, LEAVE_VX = 5, LEAP_VZ = 5, LEAP_TURN = 1.4, CHARGE_VZ = 7.5, BLOCK_IN = 0.75;

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
    if (!a.role || (a.role === 'cross' && a.phase !== 'leave' && a.phase !== 'freeze')) return false; // перебежчика двигает спавнер — кроме спугнутого гудком (src/horn.js)
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
        if (t >= 1) { a.phase = a.role === 'lunge' ? 'crouch' : (a.role === 'charge' || a.role === 'giant') ? 'prep' : 'stand'; a.pt = 0; if (a.role === 'giant') a.roar = 'new'; }
    } else if (a.phase === 'crouch' || a.phase === 'prep') { // подготовка — подпись вида (src/beast-behavior.js): прыгун приседает, таран роет землю…
        const T = a.angry ? 0.05 : (prepTime(a) || CROUCH); // разозлённый гудком — без подготовки
        a.dust = poseSignature(signatureOf(a), m, a.pt, T, 0);
        if (a.pt >= T) { a.phase = a.phase === 'crouch' ? 'leap' : 'charge'; a.pt = 0; m.rotation.x = 0; m.position.y = 0; }
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
        a.z += (a.phase === 'charge' ? (a.giant ? GIANT_VZ : CHARGE_VZ) * (a.angry ? ANGRY_K : 1) : 2.5) * dt; // разозлённый гудком — быстрее (src/horn.js)
        face(0);
        const hop = a.speciesKey === 'DEER' ? 0.28 : 0.1; // олень несётся прыжками
        m.position.y = Math.abs(Math.sin(a.pt * 16)) * hop;
        m.rotation.x = Math.sin(a.pt * 8) * 0.06;
        legs(a, a.pt * 16);
    } else if (a.phase === 'stand') { // встаёт на дыбы в полосе и стоит
        const T = prepTime(a) || 0.6;
        a.dust = poseSignature(signatureOf(a), m, Math.min(a.pt, T), T, 0);
        if (a.pt > T) m.rotation.x += Math.sin(a.pt * 3) * 0.05;
    } else if (a.phase === 'freeze') { // олень замер от гудка: стоит, смотрит, дрожит — потом убегает (src/horn.js)
        face(Math.atan2(px - a.x, Math.max(1, pz - a.z)) + Math.sin(a.pt * 45) * 0.025);
        m.rotation.x = -0.1; m.position.y = 0;
        if (a.pt >= FREEZE_T) { a.phase = 'leave'; a.pt = 0; a.fled = true; a.side = a.x >= 0 ? 1 : -1; }
    } else if (a.phase === 'leave') { // отступает: убегает с дороги на обочину
        const side = a.side || 1;
        a.x += side * LEAVE_VX * dt;
        face(side * Math.PI / 2);
        m.rotation.x = 0; m.position.y = Math.abs(Math.sin(a.pt * 16)) * 0.08;
        legs(a, a.pt * 16);
    }
    m.position.x = a.x; m.position.z = a.z;
    // проскочил мимо нападающего — увернулся
    if (!a.hit && !a.dodged && (a.phase === 'leap' || a.phase === 'land' || a.phase === 'charge') && a.z > pz + 1.5 && Math.abs(a.x - px) < 3.2) a.dodged = 'new';
    // машина проехала — зверь уходит с дороги (живой, а не исчезающий)
    if (!a.hit && a.phase !== 'leave' && a.phase !== 'run' && a.z > pz + 2.5) { a.phase = 'leave'; a.pt = 0; a.side = a.x >= 0 ? 1 : -1; }
    return true;
}
