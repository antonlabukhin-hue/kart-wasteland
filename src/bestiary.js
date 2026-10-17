/**
 * Пустошь: бестиарий — звери, которых ты встретил. Не галерея машин, а записная книжка: кто это, какой у него характер,
 * как он нападает, что делать и как он реагирует на гудок. Пока не встретил — только силуэт «???».
 * profile.bestiary = { DOG: { met, dodged, shook, scared } } — копится в заездах (src/modes/infinite-run.js).
 * Логика — чистая (тест); экран — src/ui/bestiary-screen.js.
 */
import { BEASTS } from './beast-kit.js';
import { LUNGE, CHARGE, BLOCK, GIANT } from './animal-attack.js';
import { SIGNATURE } from './beast-behavior.js';

export const ORDER = ['DOG', 'FOX', 'BOAR', 'DEER', 'BEAR', 'MONKEY', 'CAT', 'LION', 'RHINO', 'ZEBRA', 'CROC', 'HIPPO', 'GIRAFFE', 'ELEPHANT', 'DINO'];
export const EMOJI = { DOG: '🐺', FOX: '🦊', BOAR: '🐗', DEER: '🦌', BEAR: '🐻', MONKEY: '🐒', CAT: '🐈', LION: '🦁', RHINO: '🦏', ZEBRA: '🦓', CROC: '🐊', HIPPO: '🦛', GIRAFFE: '🦒', ELEPHANT: '🦣', DINO: '🦖' };

/** Характер — одна фраза, как о персонаже */
export const TRAITS = {
    DOG: 'Ходит стаей вдоль дороги. Воет, прежде чем прыгнуть.',
    FOX: 'Хитрая: припадает к земле и оглядывается через плечо — и прыжок на капот.',
    BOAR: 'Нервный и прямолинейный: роет землю копытом — и несётся тараном.',
    DEER: 'Пугливый: замирает и смотрит на машину, потом мчится прыжками.',
    BEAR: 'Медленный, но непредсказуемый: встаёт на дыбы посреди полосы.',
    MONKEY: 'Мародёр со свалки: скачет на обочине, прыгает на капот и стучит по нему.',
    CAT: 'Чумной кот: появляется из ниоткуда, бросается под колёса.',
    LION: 'Лев-пожар: грива горит, гудка не боится — злится.',
    RHINO: 'Бульдозер: опускает рог и не сворачивает.',
    ZEBRA: 'Пугливая: от гудка уносится прочь.',
    CROC: 'Ждёт в ядовитых лужах. Выползает медленно, гудок ему безразличен.',
    HIPPO: 'Болотник: почти не замечает машину, пока не встанешь у него на пути.',
    GIRAFFE: 'Видна над кучами мусора — неуклюже перебегает дорогу.',
    ELEPHANT: 'Мамонт пустоши: бывает гигантом и несётся навстречу.',
    DINO: 'Ящер из сбежавшего зоопарка: быстрый и злой.'
};
const ROLE_TEXT = { lunge: 'прыгает на капот — уйди в соседнюю полосу, вцепился — дёргай руль', charge: 'таранит по полосе — уходи с его полосы', block: 'встаёт в полосе — объезжай', cross: 'перебегает — проскочи или пропусти' };
const HORN_TEXT = { flee: 'от гудка убегает', giant: 'от гудка убегает, но гиганта не спугнуть' };

export function roleOf(sp) { return LUNGE.indexOf(sp) >= 0 ? 'lunge' : CHARGE.indexOf(sp) >= 0 ? 'charge' : BLOCK.indexOf(sp) >= 0 ? 'block' : 'cross'; }

/** Записать событие: kind — 'met' | 'dodged' | 'shook' | 'scared' */
export function recordBeast(profile, sp, kind) {
    if (!profile || !sp || ORDER.indexOf(sp) < 0) return;
    const b = profile.bestiary = profile.bestiary || {};
    const e = b[sp] = b[sp] || { met: 0, dodged: 0, shook: 0, scared: 0 };
    e[kind] = (e[kind] || 0) + 1;
}

/** Строки бестиария: { sp, name, emoji, open, trait, how, horn, sig, giant, met, dodged, shook, scared } */
export function bestiaryRows(profile) {
    const b = (profile && profile.bestiary) || {};
    return ORDER.map(function(sp) {
        const e = b[sp] || {}, open = (e.met || 0) > 0;
        return {
            sp: sp, emoji: EMOJI[sp], open: open, name: open ? (BEASTS[sp] ? BEASTS[sp].name : sp) : '???',
            trait: open ? TRAITS[sp] : 'Ещё не встречал', how: open ? ROLE_TEXT[roleOf(sp)] : '', horn: open ? HORN_TEXT[GIANT.indexOf(sp) >= 0 ? 'giant' : 'flee'] : '',
            sig: !!SIGNATURE[sp], giant: GIANT.indexOf(sp) >= 0,
            met: e.met || 0, dodged: e.dodged || 0, shook: e.shook || 0, scared: e.scared || 0
        };
    });
}
export function bestiaryCount(profile) { return bestiaryRows(profile).filter(function(r) { return r.open; }).length; }
