import { test, expect } from '@playwright/test';
import { openFreeRace, login, startFreeRace, watchProblems, waitRacing, skipLoreIfShown } from '../helpers.js';

const noAnimals = (page) => page.evaluate(() => setInterval(() => {
    const d = window.__raceDebug;
    (d.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; });
    (d.cars || []).forEach(c => { if (c.mesh) { c.x = 99; c.mesh.position.x = 99; } });
}, 50));

test('промзона: труба рушится с эстакады поперёк двух полос — по свободной полосе проезд без аварии', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.1');
    await page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('kw_road_racing_profiles_v1') || '[]');
        list.forEach(p => { p.unlockedMaps = ['arsenev', 'promzona', 'svalka']; p.hasSeenShop = true; });
        localStorage.setItem('kw_road_racing_profiles_v1', JSON.stringify(list));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await openFreeRace(page);
    await page.locator('.difficulty-btn[data-diff="easy"]').click();
    await skipLoreIfShown(page);
    await page.locator('.map-card[data-map="promzona"]').click();
    await page.locator('#map-select-go').click();
    await waitRacing(page);
    await noAnimals(page);
    const pipe = await page.evaluate(() => { const p = window.__raceDebug.pipeDrop; return p && { z: p.z, free: p.freeLane }; });
    expect(pipe).toBeTruthy();
    // по свободной полосе
    await page.evaluate((free) => setInterval(() => window.__raceDebug.setX([-2, 0, 2][free] * window.__raceDebug.trackWidth / 8), 30), pipe.free);
    /* газ жмётся сам (W — прыжок) */
    await expect.poll(() => page.evaluate(() => window.__raceDebug.pipeDrop.debug.state), { timeout: 40_000 }).toBe('down');
    await expect.poll(() => page.evaluate((z) => window.__raceDebug.z < z - 5, pipe.z), { timeout: 20_000 }).toBe(true);
    /* газ жмётся сам (W — прыжок) */
    expect(await page.evaluate(() => window.__raceDebug.hitLog.filter(h => h.cause === 'pipe').length)).toBe(0);
    expect(problems).toEqual([]);
});

for (const map of ['arsenev', 'promzona', 'svalka']) {
    test('узнаваемые детали: ' + map + ' — события в полосах и приметы у обочины, проезд без ошибок', async ({ page }) => {
        const problems = watchProblems(page);
        await login(page, 'Тестер', './?start=0.05');
        await page.evaluate(() => {
            const list = JSON.parse(localStorage.getItem('kw_road_racing_profiles_v1') || '[]');
            list.forEach(p => { p.unlockedMaps = ['arsenev', 'promzona', 'svalka']; p.hasSeenShop = true; });
            localStorage.setItem('kw_road_racing_profiles_v1', JSON.stringify(list));
        });
        await page.reload();
        await page.locator('#splash-screen').click();
        await page.locator('#profile-list').getByText('Тестер').click();
        await openFreeRace(page);
        await page.locator('.difficulty-btn[data-diff="easy"]').click();
        await skipLoreIfShown(page);
        await page.locator('.map-card[data-map="' + map + '"]').click();
        await page.locator('#map-select-go').click();
        await waitRacing(page);
        const evs = await page.evaluate(() => window.__raceDebug.setEvents.map(e => ({ kind: e.kind, z: e.z })));
        expect(evs.length).toBeGreaterThanOrEqual(1);
        // проехать сквозь первое событие: оно срабатывает (двигается/падает) и не ломает заезд
        await noAnimals(page);
        await page.evaluate((z) => window.__raceDebug.setZ(z + 70), evs[0].z);
        /* газ жмётся сам (W — прыжок) */
        await expect.poll(() => page.evaluate((z) => window.__raceDebug.z < z - 5, evs[0].z), { timeout: 60_000 }).toBe(true);
        /* газ жмётся сам (W — прыжок) */
        expect(await page.evaluate(() => { const s = window.__raceDebug.setEvents[0].debug; return s.state || 'swing'; })).not.toBe('wait');
        expect(problems).toEqual([]);
    });
}
