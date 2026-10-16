/**
 * Пустошь: звуки-предупреждения зверей — за ~1 с до броска (src/animals.js onTell). У каждого вида нападения свой:
 *   lunge  — вой (волк, лиса, кот, лев, обезьяна): сейчас прыгнет на капот;
 *   charge — топот, ускоряется (кабан, носорог, олень, зебра, ящер): сейчас понесётся навстречу;
 *   block  — низкий рык с дрожью (медведь, слон, бегемот, крокодил): встанет в полосе;
 *   giant  — рёв гиганта с тяжёлыми шагами.
 * Синтез на WebAudio, без файлов. warnSfx(role) — имя звука по роли (чистая, тест); playBeast — проиграть.
 */
export const BEAST_SFX = { lunge: 'beast_howl', charge: 'beast_stomp', block: 'beast_growl', giant: 'beast_giant' };

/** Звук-предупреждение для роли зверя (src/animal-attack.js); перебегающему — нет */
export function warnSfx(role) { return BEAST_SFX[role] || null; }

/** Проиграть звук name (из BEAST_SFX) в out с момента t0; vs — громкость; noise — буфер шума (src/sfx-kit.js makeNoise) */
export function playBeast(name, ctx, out, t0, vs, noise) {
    const osc = function(type, f0, f1, at, dur, peak, lfo) {
        const o = ctx.createOscillator(), g = ctx.createGain(), ts = t0 + at;
        o.type = type;
        o.frequency.setValueAtTime(f0, ts);
        if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), ts + dur);
        g.gain.setValueAtTime(0.0001, ts);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * vs), ts + Math.min(0.08, dur / 3));
        g.gain.exponentialRampToValueAtTime(0.001, ts + dur);
        let src = o;
        if (lfo) { // дрожь: частота (вой) или громкость (рык — через отдельный узел, огибающая не ломается)
            const l = ctx.createOscillator(), lg = ctx.createGain();
            l.frequency.value = lfo.rate; lg.gain.value = lfo.depth;
            l.connect(lg);
            if (lfo.gain) { const tg = ctx.createGain(); tg.gain.value = 1 - lfo.depth; lg.connect(tg.gain); o.connect(tg); src = tg; }
            else lg.connect(o.frequency);
            l.start(ts); l.stop(ts + dur + 0.02);
        }
        src.connect(g); g.connect(out); o.start(ts); o.stop(ts + dur + 0.02);
        return o;
    };
    const hiss = function(type, freq, at, dur, peak) {
        if (!noise) return;
        const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), ts = t0 + at;
        n.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
        g.gain.setValueAtTime(Math.max(0.001, peak * vs), ts);
        g.gain.exponentialRampToValueAtTime(0.001, ts + dur);
        n.connect(f); f.connect(g); g.connect(out); n.start(ts); n.stop(ts + dur + 0.02);
    };
    const thump = function(at, peak) { osc('sine', 95, 38, at, 0.16, peak); hiss('lowpass', 220, at, 0.12, peak * 0.9); };
    if (name === 'beast_howl') {
        const o = osc('sine', 330, null, 0, 0.95, 0.16, { rate: 6, depth: 14 });
        o.frequency.exponentialRampToValueAtTime(640, t0 + 0.35); o.frequency.exponentialRampToValueAtTime(430, t0 + 0.95);
        const o2 = osc('triangle', 660, null, 0, 0.9, 0.05, { rate: 6, depth: 25 });
        o2.frequency.exponentialRampToValueAtTime(1280, t0 + 0.35); o2.frequency.exponentialRampToValueAtTime(860, t0 + 0.9);
        hiss('bandpass', 1400, 0, 0.5, 0.04);
    } else if (name === 'beast_stomp') {
        [0, 0.2, 0.36, 0.49, 0.6, 0.7].forEach(function(at, i) { thump(at, 0.16 + i * 0.03); });
        osc('sawtooth', 110, 70, 0.55, 0.3, 0.05); // фырк в конце
        hiss('highpass', 1800, 0.55, 0.22, 0.05);
    } else if (name === 'beast_growl') {
        osc('sawtooth', 78, 62, 0, 0.85, 0.15, { rate: 23, depth: 0.45, gain: true });
        osc('square', 118, 90, 0, 0.8, 0.05, { rate: 23, depth: 0.35, gain: true });
        hiss('bandpass', 320, 0, 0.8, 0.12);
    } else if (name === 'beast_giant') {
        osc('sawtooth', 62, 30, 0.05, 1.1, 0.24, { rate: 9, depth: 4 });
        osc('square', 96, 44, 0.05, 0.95, 0.12);
        hiss('bandpass', 240, 0.05, 1, 0.2);
        [0, 0.45, 0.85].forEach(function(at) { thump(at, 0.3); });
    }
}
