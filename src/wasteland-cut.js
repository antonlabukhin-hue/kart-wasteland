/**
 * Пустошь: что из прежней игры выключено (этап «чистка», 17.10). Код систем не удалён — выключен здесь,
 * чтобы при надобности вернуть одной строкой. Каждый флаг true — «выключено».
 *
 * В заезде: выдуманные соперники (src/leaderboard.js ACTIVE_RIVALS), видеокассеты, ящики «?», усиления «Магнит» и «×2 Е»
 * (броня осталась — она про сердца), стрелки-подсказки клавиш, «Чистая посадка», радио-реплики, рекламные щиты, мемы 90-х,
 * «пейзаж недели» (×2 Е), артефакты 90-х для альбома. В меню и на итогах: машина недели, «место на неделе», «Подарки» до N заездов, фантазийные машины.
 */
export const CUT = {
    vhs: true,
    crates: true,
    powers: ['magnet', 'x2'],
    moveArrows: true,
    landing: true,
    radio: true,
    billboards: true,
    memes: true,
    weekTheme: true,
    weekCar: true,
    boardRank: true,
    giftsAfterRuns: 3,
    wordDay: true,
    dailyRun: true,
    testDrive: true,
    secretPaints: true,
    giftCars: true,
    artifacts: true,
    horn: true, // кнопка нитро — гудок, слипстрима за обломками нет (src/horn.js)
    nitro: true, // подбираемого нитро нет, «В УДАРЕ» и уклонения не ускоряют (отзыв 18.10: «куча лишних ускорений»)
    slides: true // скользких пятен (масло, лёд, кислота) втрое меньше (отзыв 18.10)
};

/** Пропустить ли предмет плана трассы (src/plan-place.js): кассета, ящик «?», выключенное усиление */
/** Скользкое пятно → яма (в Пустоши остаётся каждое третье): плана трассы касается до расстановки (src/plan-place.js) */
export function softenSlide(it) {
    if (!CUT.slides || !it || it.kind !== 'obstacle' || ['slide', 'oil', 'ice', 'acid'].indexOf(it.type) < 0) return it;
    if (Math.floor(Math.abs(it.d || 0) / 7) % 3 !== 0) it.type = 'pothole';
    return it;
}

export function cutPlanItem(it) {
    if (!it) return false;
    if (it.kind === 'vhs') return !!CUT.vhs;
    if (it.kind === 'crate') return !!CUT.crates;
    if (it.kind === 'power') return CUT.powers.indexOf(it.type) >= 0;
    if (it.kind === 'letter') return !!CUT.wordDay;
    if (it.kind === 'nitro') return !!CUT.nitro;
    return false;
}

/**
 * Машины Пустоши: 12 советских «рабочих» (и «Шестисотый» из 90-х) — их видно в витрине и гараже; фантазийные и «киношные»
 * (машина времени, ковёр-самолёт, призрачный патруль, колесница, киборг…) спрятаны: не в тон пустоши и отсылки к чужим брендам.
 * Уже купленную спрятанную машину не отнимаем — она видна у владельца.
 */
export const WASTELAND_CARS = ['cheburashka', 'kirpich', 'turbo', 'gorbaty', 'pirozhok', 'saray', 'gazel', 'rafik', 'buhanka', 'bull', 'zubilo', 'shestisot'];
export function carVisible(id, owned) { return WASTELAND_CARS.indexOf(id) >= 0 || !!(owned && owned.indexOf(id) >= 0); }
