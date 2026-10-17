/**
 * Пустошь: каждое новое нападение зверя — один раз с подсказкой. Когда зверь нового вида нападения впервые
 * появляется (за 2–3 с до броска, раньше голоса — src/animals.js onTell), сверху — плашка: что это и что делать. Без паузы:
 * заезд идёт, плашка короткая. Знакомые — в localStorage (на устройстве), больше не показываются.
 *
 * hintDue(role, seen) — какую подсказку показать (чистая, тест), loadHints / saveHints — хранение.
 */
export const HINT_KEY = 'kw_attack_hints_v1';

export const ATTACK_HINTS = {
    lunge: { icon: '🐺', title: 'ПРЫГУН', text: 'Воет — сейчас прыгнет на капот: уйди в соседнюю полосу. Вцепился — дёргай руль влево-вправо' },
    charge: { icon: '🐗', title: 'ТАРАН', text: 'Топот — понесётся навстречу по полосе: уходи, он не сворачивает' },
    block: { icon: '🐻', title: 'ВСТАНЕТ НА ПУТИ', text: 'Рык — выйдет и встанет посреди полосы: объезжай по свободной' },
    giant: { icon: '🦣', title: 'ГИГАНТ', text: 'Рёв — огромный зверь несётся навстречу: в соседнюю полосу, там он не заденет' }
};

/** Подсказка для нападения role, если игрок его ещё не видел (seen — Set), иначе null */
export function hintDue(role, seen) {
    return ATTACK_HINTS[role] && !(seen && seen.has(role)) ? ATTACK_HINTS[role] : null;
}

export function loadHints() {
    try {
        const raw = localStorage.getItem(HINT_KEY);
        if (raw === 'all') return new Set(Object.keys(ATTACK_HINTS));
        return new Set(JSON.parse(raw || '[]'));
    } catch (e) { return new Set(); }
}
export function saveHints(seen) {
    try { localStorage.setItem(HINT_KEY, JSON.stringify(Array.from(seen))); } catch (e) {}
}
