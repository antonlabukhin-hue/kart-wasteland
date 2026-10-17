/**
 * Экран «Звери пустоши» (бестиарий, src/bestiary.js): карточка на каждого зверя — значок, имя, характер, как нападает,
 * что делать, реакция на гудок и счётчики (встретил, увернулся, стряхнул, спугнул). Невстреченные — «???».
 * Открывается из нижней панели меню (🐾 Звери); закрывается кнопкой «Назад» или Esc.
 */
import { bestiaryRows, bestiaryCount, ORDER } from '../bestiary.js';

const esc = function(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

export function bestiaryHtml(profile) {
    const rows = bestiaryRows(profile);
    const cards = rows.map(function(r) {
        if (!r.open) return '<div class="bst-card locked"><i>' + r.emoji + '</i><b>???</b><small>' + esc(r.trait) + '</small></div>';
        const stat = ['встретил ' + r.met, r.dodged ? 'увернулся ' + r.dodged : '', r.shook ? 'стряхнул ' + r.shook : '', r.scared ? 'спугнул ' + r.scared : ''].filter(Boolean).join(' · ');
        return '<div class="bst-card"><i>' + r.emoji + '</i><b>' + esc(r.name) + (r.giant ? ' <em>бывает гигантом</em>' : '') + '</b>'
            + '<p>' + esc(r.trait) + '</p><p class="bst-how">⚠ ' + esc(r.how) + '</p><p class="bst-horn">📯 ' + esc(r.horn) + '</p><small>' + esc(stat) + '</small></div>';
    }).join('');
    return '<div class="bst-head"><h2>🐾 ЗВЕРИ ПУСТОШИ</h2><span>встречено ' + bestiaryCount(profile) + ' из ' + ORDER.length + '</span>'
        + '<button type="button" class="bst-close">← Назад</button></div><div class="bst-grid">' + cards + '</div>';
}

export function openBestiary(profile) {
    let el = document.getElementById('bestiary-screen');
    if (!el) { el = document.createElement('div'); el.id = 'bestiary-screen'; document.body.appendChild(el); }
    el.innerHTML = bestiaryHtml(profile);
    el.classList.add('open');
    const close = function() { el.classList.remove('open'); document.removeEventListener('keydown', onKey, true); };
    const onKey = function(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey, true);
    el.querySelector('.bst-close').addEventListener('click', close);
    return close;
}
