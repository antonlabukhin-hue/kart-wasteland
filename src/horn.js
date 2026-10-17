/**
 * Пустошь: гудок — второе действие игрока, про зверей. Одна кнопка (там, где было нитро), перезарядка HORN_CD.
 * Правило одно (отзыв 18.10: «непонятно, зачем гудок»): гудок спугивает любого зверя впереди (до HORN_RANGE ед.) —
 * он бросает нападение и убегает с дороги. Гигантов гудком не спугнуть — от них только уходить из полосы.
 * Кнопка светится, когда впереди есть кого спугнуть, а гудок готов (state().k). Перезарядка длинная — гудок это запас, а не спам.
 * Прежние реакции по видам (злятся, замирают) — HORN_REACT, сейчас не используются.
 * hornReact(a) и applyHorn(a, react) — чистые (тест); createHorn(o) — перезарядка и надписи.
 */
export const HORN_CD = 6, HORN_RANGE = 70, FREEZE_T = 1.6, ANGRY_K = 1.3;

export const HORN_REACT = {
    DOG: 'flee', FOX: 'flee', CAT: 'flee', MONKEY: 'flee', ZEBRA: 'flee', GIRAFFE: 'flee', CHICKEN: 'flee', PEACOCK: 'flee',
    BOAR: 'anger', RHINO: 'anger', BEAR: 'anger', LION: 'anger', DINO: 'anger',
    DEER: 'freeze',
    HIPPO: 'ignore', ELEPHANT: 'ignore', CROC: 'ignore'
};
export const HORN_SAY = { none: '📯 Рядом никого', flee: '📯 Спугнул!', anger: '🐗 Разозлил!', freeze: '🦌 Замер на месте!', ignore: '🦛 Даже не глянул' };
/** Что важнее показать, если зверей несколько: злой опаснее замершего, тот — спугнутого */
const RANK = { anger: 3, freeze: 2, flee: 1, ignore: 0 };

/** Реакция зверя на гудок: гигант злится всегда; уже сбит, ушёл или убегает — никак */
export function hornReact(a) {
    if (!a || a.hit || a.fled || a.phase === 'leave' || a.phase === 'leap' || a.phase === 'land') return null;
    return a.giant ? 'ignore' : 'flee'; // одно правило: спугнуть можно всех, кроме гигантов
}

/** Применить реакцию к зверю (меняет его поля; движение — src/animal-attack.js stepAttack) */
export function applyHorn(a, react) {
    if (!react || react === 'ignore') return a;
    const wake = function() { a.told = true; a.triggered = true; if (a.mesh) a.mesh.visible = true; };
    if (react === 'flee') {
        wake(); a.fled = true; a.phase = 'leave'; a.pt = 0; a.side = a.x > 0.2 ? 1 : a.x < -0.2 ? -1 : (a.direction || 1);
    } else if (react === 'freeze') {
        wake(); a.phase = 'freeze'; a.pt = 0;
    } else if (react === 'anger') {
        wake(); a.angry = true;
        if (!a.role || a.role === 'cross') a.role = 'charge';
        if (a.role === 'block') { a.role = 'charge'; if (a.phase === 'stand') { a.phase = 'charge'; a.pt = 0; } }
        if (a.phase === 'prep' || a.phase === 'crouch') a.pt = 99; // подготовки не будет — сразу бросок
    }
    return a;
}

/**
 * o: { animals() → [звери], z() → z машины, popup(text), sfx(name, vol, pitch), onReact(a, react) }
 * → { fire(): true — прогудел, tick(dt), state() → { charge 0..1, ready } для кнопки }
 */
export function createHorn(o) {
    let cd = 0;
    return {
        fire: function() {
            if (cd > 0) return false;
            cd = HORN_CD;
            if (o.sfx) o.sfx('horn', 1.3, 1);
            const z = o.z();
            let best = null, n = 0;
            (o.animals() || []).forEach(function(a) {
                const d = z - a.z;
                if (d < -2 || d > HORN_RANGE || !(a.mesh && a.mesh.visible)) return;
                const r = hornReact(a);
                if (!r) return;
                applyHorn(a, r); if (r === 'flee') n++;
                if (o.onReact) o.onReact(a, r); // бестиарий: «спугнул» (src/bestiary.js)
                if (!best || RANK[r] > RANK[best]) best = r;
            });
            if (o.popup) o.popup(best === 'flee' ? HORN_SAY.flee + (n > 1 ? ' ×' + n : '') : best === 'ignore' ? '🦣 Гиганта гудком не спугнуть!' : HORN_SAY.none);
            return true;
        },
        tick: function(dt) { if (cd > 0) cd = Math.max(0, cd - dt); },
        /** k = 1 — впереди нападающий зверь, которого можно спугнуть: кнопка светится (подсказка «жми») */
        state: function() {
            const z = o.z(), threat = cd <= 0 && (o.animals() || []).some(function(a) { const d = z - a.z; return d > 4 && d < HORN_RANGE && a.mesh && a.mesh.visible && a.told && !a.hit && !a.fled && !a.giant && a.role && a.role !== 'cross' && a.phase !== 'leave'; });
            return { charge: 1 - cd / HORN_CD, ready: cd <= 0, k: threat ? 1 : 0 };
        }
    };
}
