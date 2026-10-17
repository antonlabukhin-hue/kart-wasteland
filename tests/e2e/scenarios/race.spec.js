import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, startCampaign, progress, waitRacing } from '../helpers.js';

// Тестовая сборка: ?start=… начинает заезд с этой доли трассы. Дальше тест только жмёт газ, как игрок
const profile = page => page.evaluate(() => {
    const id = localStorage.getItem('kw_road_racing_session_player');
    return JSON.parse(localStorage.getItem('kw_road_racing_profiles_v1') || '[]').find(p => p.id === id);
});

test('босс появляется после 42% трассы', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.40');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    const boss =page.waitForEvent('console', { predicate: m => m.text().startsWith('🐻 БОСС:'), timeout: 60_000 });
    /* газ жмётся сам (W — прыжок) */
    await boss;
    // появился на пороге, а не сразу со старта на 40%
    expect(await progress(page)).toBeGreaterThanOrEqual(41.5);
    await page.waitForTimeout(5000);
    /* газ жмётся сам (W — прыжок) */
    expect(problems).toEqual([]);
});

test('победа в свободном заезде засчитывается в профиль', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#finish-screen')).toContainText(/ФИНИШ|ИДЕАЛЬНЫЙ ЗАЕЗД/, { timeout: 150_000 });
    // ранг D–S — у свободного заезда есть, у кампании нет (там звёзды)
    await expect(page.locator('#finish-screen .finish-rank .fr-letter')).toHaveText(/^[DCBAS]$/);
    /* газ жмётся сам (W — прыжок) */
    const p = await profile(page);
    expect(p.stats.wins).toBe(1);
    expect(p.stats.totalRaces).toBe(1);
    expect(p.season.chips).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

// Одна победа проверяет сразу всё, что после неё: «Заново», открытие 2-й трассы и сохранение
