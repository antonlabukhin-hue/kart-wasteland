/**
 * Итоги бесконечной трассы — «от чего погиб» и одна цель:
 *   «💀 Погиб: кабан-таран — таран, 1 234 м» — последняя авария, с видом нападения зверя (прыжок, таран, гигант…);
 *   журнал ударов за заезд — значок, кто/что и на каком метре (hits);
 *   «🎯 Цель: …» — самая близкая цель из «почти» (src/nearly.js): рекорд, соперник, задание; нет — рекорд + 150 м;
 *   «💡 …» — совет именно против того, что убило (у каждого нападения свой: вой — уйди из полосы, топот — таран…).
 * Логика — чистая (с тестами).
 */
import { HURDLES } from './hop-duck.js';
import { HAZARD_KIND } from './hazards.js';

const CAR_NAMES = { btr: 'БТР', tank: 'танк', plane: 'самолёт', heli: 'вертолёт', tanker: 'бензовоз', tractor: 'трактор', bus: 'автобус', truck: 'грузовик', van: 'фургон', suv: 'внедорожник', moto: 'мотоцикл', sedan: 'легковушка', car: 'легковушка' };
const CAR_ICONS = { btr: '🪖', tank: '🪖', plane: '✈', heli: '🚁', tanker: '⛽', tractor: '🚜', bus: '🚌', truck: '🚛', van: '🚐', suv: '🚙', moto: '🏍', sedan: '🚗', car: '🚗' };
/** Вид нападения зверя (src/animal-attack.js) — как сказать на итогах */
export const ROLE_NAMES = { lunge: 'прыжок на капот', charge: 'таран', block: 'встал в полосе', giant: 'гигант навстречу', cross: 'перебегал' };

/**
 * Причина аварии → { name (кто/что, именительный), cls (класс угрозы, ключ TIPS), icon, how (вид нападения зверя или '') }.
 * role — вид нападения зверя из журнала (lunge, charge, block, giant, cross); animalIcons — { BEAR: '🐻' }.
 */
export function causeInfo(cause, animalNames, role, animalIcons) {
    const s = String(cause || '');
    if (s.indexOf('car:') === 0 || s === 'car') return { name: CAR_NAMES[s.slice(4)] || 'обломок', cls: 'car', icon: CAR_ICONS[s.slice(4)] || '🚗', how: '' };
    if (/^[A-Z]+$/.test(s)) {
        const name = animalNames && animalNames[s] ? animalNames[s].toLowerCase() : 'зверь';
        return { name: name, cls: role && TIPS['a_' + role] ? 'a_' + role : 'threat', icon: (animalIcons && animalIcons[s]) || '🐾', how: ROLE_NAMES[role] || '' };
    }
    if (s === 'boss') return { name: 'босс', cls: 'other', icon: '👊', how: '' };
    if (HURDLES[s]) return { name: HURDLES[s].name.toLowerCase(), cls: HURDLES[s].act === 'duck' ? 'duck' : 'jump', icon: HURDLES[s].act === 'duck' ? '🚧' : '🪵', how: '' };
    if (s === 'gap') return { name: 'разлом', cls: 'gap', icon: '🕳', how: '' };
    if (s === 'ремонт' || s === 'roadworks') return { name: 'ремонт дороги', cls: 'block', icon: '🚧', how: '' };
    if (HAZARD_KIND[s]) return { name: s, cls: HAZARD_KIND[s] === 'skid' ? 'slide' : 'slow', icon: '⚠', how: '' };
    return { name: s || 'авария', cls: 'other', icon: '💥', how: '' };
}

export const TIPS = {
    car: 'Обломки стоят по одному в ряду — две полосы всегда свободны: смотри дальше вперёд',
    a_lunge: 'Прыгун воет за секунду до прыжка — уйди в соседнюю полосу; вцепился — дёргай руль влево-вправо',
    a_charge: 'Топот — сейчас таран: уходи с его полосы, он не сворачивает',
    a_block: 'Рык — зверь встанет посреди полосы: объезжай по свободной',
    a_giant: 'Рёв гиганта — уходи в соседнюю полосу: там он не заденет',
    a_cross: 'Зверь перебегает — проскочи до него или пропусти',
    threat: 'Зверь на обочине смотрит на тебя — сейчас выбежит: держи свободную полосу',
    jump: 'Труба — прыжок ▲',
    duck: 'Шлагбаум с табличкой — подныр ▼',
    gap: 'Разлом — только по трамплину',
    block: 'Путь перекрыт — объезжай заранее',
    slow: 'Яма тормозит — объезжай',
    slide: 'Скользкое пятно — объезжай, руль ровно',
    other: 'Цепочка «Е» показывает свободный путь'
};

/** Сколько ударов в журнале на итогах (последние) */
export const MAX_HITS = 6;
/** Как назвать удар: «кабан-таран — таран» */
function label(ci) { return ci.name + (ci.how ? ' — ' + ci.how : ''); }

/**
 * o: { dist, best (рекорд до заезда), isNew, crashes — [{ cause, role, dist }], near — строки «почти» [{ icon, text }],
 *      animalNames — { BEAR: 'Медведь' }, animalIcons — { BEAR: '🐻' } }
 * → { why, hits: [{ icon, text }], goal, tip } (строки, без разметки)
 */
export function runGoal(o) {
    const cr = (o && o.crashes) || [], last = cr[cr.length - 1];
    const fmt = function(n) { return Math.round(n || 0).toLocaleString('ru-RU'); };
    const info = function(c) { return causeInfo(c.cause, o.animalNames, c.role, o.animalIcons); };
    const li = last ? info(last) : null;
    const why = li ? '💀 Погиб: ' + label(li) + (last.dist != null ? ', ' + fmt(last.dist) + ' м' : '') : '';
    const hits = cr.length > 1 ? cr.slice(-MAX_HITS).map(function(c) { const ci = info(c); return { icon: ci.icon, text: label(ci) + (c.dist != null ? ' · ' + fmt(c.dist) + ' м' : '') }; }) : [];
    const n = o && o.near && o.near[0];
    const goal = n ? '🎯 ' + n.text : o && o.isNew ? '🎯 Новый рекорд! Следующая цель — ' + fmt(Math.ceil(((o.dist || 0) + 150) / 50) * 50) + ' м'
        : '🎯 Цель — ' + fmt(Math.ceil((Math.max(o && o.best || 0, o && o.dist || 0) + 150) / 50) * 50) + ' м';
    const tip = li ? '💡 ' + TIPS[li.cls] : '';
    return { why: why, hits: hits, goal: goal, tip: tip };
}

export function runGoalHtml(g) {
    if (!g) return '';
    const esc = function(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    const hits = g.hits && g.hits.length ? '<div class="g-hits"><span class="g-hits-t">Удары за заезд:</span>' + g.hits.map(function(h) { return '<span class="g-hit"><i>' + esc(h.icon) + '</i>' + esc(h.text) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="f2-goal">' + (g.why ? '<div class="g-why">' + esc(g.why) + '</div>' : '') + hits + '<div class="g-goal">' + esc(g.goal) + '</div>' + (g.tip ? '<div class="g-tip">' + esc(g.tip) + '</div>' : '') + '</div>';
}
