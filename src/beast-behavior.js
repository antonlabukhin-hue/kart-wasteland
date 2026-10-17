/**
 * Пустошь: звери — персонажи, а не препятствия. Игрок должен по телу зверя понять, что тот сейчас сделает:
 *   спокоен (пасётся на обочине, голова вниз) → насторожился (поднял голову, смотрит на машину, подал голос) →
 *   готовится (подпись вида) → атакует → уходит (после броска убегает с дороги — «отступает»).
 * Подготовка длиннее самой атаки — успеть увидеть, кто это, что задумал и куда уходить.
 *
 * Подписи пяти эталонных зверей:
 *   кабан — скребёт землю копытом, голова вниз, пыль из-под копыт (таран);
 *   медведь — поднимается на задние лапы и разводит передние (встаёт в полосе);
 *   олень — замирает, смотрит на машину и дрожит (потом рывок прыжками);
 *   лиса — припадает к земле и оглядывается через плечо (прыжок);
 *   обезьяна — скачет на месте (прыжок на капот).
 * Остальные — по роли: прыгун приседает, таран опускает голову, «встал в полосе» поднимается.
 *
 * signatureOf / prepTime / eyeLevel — чистые (тест); poseSignature, poseIdle, poseAlert — двигают модель
 * (только rotation, position и ноги userData.isLeg — масштаб модели не трогаем: он — размер зверя).
 */
export const SIGNATURE = { BOAR: 'scrape', BEAR: 'rear', DEER: 'freeze', FOX: 'stalk', MONKEY: 'hop' };
/** Чьи подписи к какой роли подходят (медведь-гигант тоже встаёт на дыбы перед броском) */
const SIG_ROLES = { scrape: ['charge', 'giant'], rear: ['block', 'giant'], freeze: ['charge'], stalk: ['lunge'], hop: ['lunge'] };
const ROLE_SIG = { lunge: 'crouch', charge: 'lower', giant: 'lower', block: 'rise' };
/** Длительность подготовки, с: у подписей — дольше, у обычных — коротко */
export const PREP = { scrape: 0.9, rear: 0.85, freeze: 0.75, stalk: 0.8, hop: 0.75, crouch: 0.5, lower: 0.55, rise: 0.6 };
/** Сколько секунд зверь виден спокойным на обочине до того, как насторожится */
export const IDLE_S = 0.8;

export function signatureOf(a) {
    if (!a || !a.role || a.role === 'cross') return null;
    const s = SIGNATURE[a.speciesKey];
    if (s && SIG_ROLES[s].indexOf(a.role) >= 0) return s;
    return ROLE_SIG[a.role] || null;
}
export function prepTime(a) { const s = signatureOf(a); return s ? PREP[s] : 0; }

/**
 * Глаза по состоянию: 0 — спокоен (тусклые, без свечения), 0.5 — насторожился, 1 — готовится и атакует;
 * сбит, увернулись или уходит — гаснут. Свечение — часть поведения, а не постоянная маска.
 */
export function eyeLevel(a) {
    if (!a || a.hit || a.dodged || a.phase === 'leave') return 0;
    if (!a.role || a.role === 'cross') return a.triggered ? 0.5 : 0;
    if (a.phase && a.phase !== 'run') return 1;
    if (a.triggered) return 0.8;
    return a.told ? 0.5 : 0;
}

function legsSet(m, fn) {
    if (!m || !m.traverse) return;
    m.traverse(function(o) { if (o.userData && o.userData.isLeg) o.rotation.x = fn(o.userData.legIndex | 0); });
}

/** Спокоен: пасётся — голова к земле, медленно покачивается; ph — своя фаза у каждого зверя */
export function poseIdle(m, t, ph) {
    m.rotation.x = 0.32 + Math.sin(t * 1.7 + ph) * 0.05;
    m.position.y = 0;
    legsSet(m, function() { return 0; });
}
/** Насторожился: голову вверх, смотрит на машину (yaw — на машину), переминается */
export function poseAlert(m, t, yaw) {
    m.rotation.y = yaw;
    m.rotation.x = -0.06;
    m.position.y = Math.abs(Math.sin(t * 9)) * 0.03;
}

/**
 * Подготовка — подпись вида. t — с от начала, T — длительность, yaw — на машину.
 * Возвращает true, когда в этот момент из-под ног летит пыль (кабан скребёт, медведь опускается, обезьяна приземляется).
 */
export function poseSignature(sig, m, t, T, yaw) {
    const k = Math.min(1, t / (T || 1));
    let dust = false;
    m.rotation.y = yaw;
    if (sig === 'scrape') { // голова вниз, переднее копыто роет землю
        m.rotation.x = 0.2; m.position.y = Math.abs(Math.sin(t * 7)) * 0.02;
        legsSet(m, function(i) { return i === 0 ? Math.sin(t * 14) * 0.9 : 0; });
        dust = Math.sin(t * 14) > 0.92;
    } else if (sig === 'rear') { // встаёт на задние лапы, передние — вперёд и в стороны
        const r = Math.min(1, k * 1.6);
        m.rotation.x = -0.75 * r; m.position.y = 0.22 * r;
        legsSet(m, function(i) { return i < 2 ? -1.1 * r : 0.25 * r; });
        dust = k > 0.55 && k < 0.62;
    } else if (sig === 'freeze') { // замер, смотрит, дрожит
        m.rotation.x = -0.1; m.position.y = 0;
        m.rotation.y = yaw + Math.sin(t * 45) * 0.025;
        legsSet(m, function() { return 0; });
    } else if (sig === 'stalk') { // припал к земле, оглядывается через плечо
        m.rotation.x = 0.28; m.position.y = -0.04;
        m.rotation.y = yaw + (k < 0.65 ? Math.sin(k / 0.65 * Math.PI) * 0.9 : 0);
        legsSet(m, function(i) { return i < 2 ? -0.35 : 0.45; });
    } else if (sig === 'hop') { // скачет на месте, всё выше
        const h = Math.abs(Math.sin(t * 11));
        m.rotation.x = -0.15; m.position.y = h * (0.18 + 0.2 * k);
        legsSet(m, function(i) { return (i < 2 ? -0.6 : 0.6) * h; });
        dust = h < 0.08 && t > 0.1;
    } else if (sig === 'crouch') { // присел — сейчас прыгнет
        m.rotation.x = 0.25 * Math.min(1, k * 2); m.position.y = -0.02;
    } else if (sig === 'lower') { // опустил голову, бьёт копытом
        m.rotation.x = 0.16; m.position.y = 0;
        legsSet(m, function(i) { return i === 1 ? Math.sin(t * 12) * 0.6 : 0; });
        dust = Math.sin(t * 12) > 0.95;
    } else if (sig === 'rise') {
        const r = Math.min(1, k * 1.5);
        m.rotation.x = -0.45 * r; m.position.y = 0.1 * r;
        legsSet(m, function(i) { return i < 2 ? -0.7 * r : 0; });
    }
    return dust;
}
