import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// «Дорожный прорыв: Пустошь» — один режим: бесконечная трасса в постапокалипсисе.
// На дороге стоят разбитые машины (не едут и не перестраиваются), звери — бешеные, встречки нет,
// вдоль дороги — выгоревшие машины, дым, трещины; гонится не ГАИ, а босс компании.
test('Пустошь: один режим, обломки стоят, звери бешеные, вокруг — апокалипсис @wasteland', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#main-menu-screen h1')).toContainText('ПУСТОШЬ');
    await expect(page.locator('.menu-card[data-menu="campaign"]')).toBeHidden();
    await expect(page.locator('.menu-card[data-menu="endless"]')).toBeHidden();
    await page.locator('#main-menu-play').click();
    if (await page.locator('#shop-action').isVisible().catch(() => false)) await page.locator('#shop-action').click();
    await waitRacing(page);

    // едем: аварии не копятся (проверяем мир, а не вождение), погоня не мешает
    await page.evaluate(() => { window.__keep = setInterval(() => { const g = window.__raceDebug; g.setStrikes(0); try { g.police && g.police.stop(); } catch (e) {} }, 100); });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.inf.dist), { timeout: 30_000 }).toBeGreaterThan(120);

    const s = await page.evaluate(() => {
        const g = window.__raceDebug;
        const z0 = g.cars.map(c => c.z);
        return new Promise(res => setTimeout(() => {
            const kinds = ['sedan', 'van', 'suv', 'truck', 'bus', 'btr'];
            let waste = 0, cracks = 0;
            g.scene.children.forEach(o => { if (/^waste:/.test(o.name)) { waste++; if (/crack|scorch/.test(o.name)) cracks++; } });
            res({
                n: g.cars.length,
                notWrecks: g.cars.filter(c => !(kinds.includes(c.kind) && c.speed === 0 && c.laneChangeTimer >= 1e8)).map(c => c.kind + ':' + c.speed + ':' + c.laneChangeTimer),
                moved: g.cars.filter((c, i) => c.z !== z0[i] && Math.abs(c.z - z0[i]) < 50).length, // переставленные вперёд — не в счёт
                smoke: g.cars.filter(c => { const f = c.mesh.getObjectByName('wreckFx'); return f && f.children.length; }).length,
                onc: g.onc, waste, cracks,
                theme: document.querySelector('#weatherDisplay').textContent
            });
        }, 1500));
    });
    expect(s.n).toBeGreaterThanOrEqual(12);
    expect(s.notWrecks).toEqual([]);
    expect(s.moved).toBe(0);
    expect(s.smoke).toBeGreaterThan(0);
    expect(s.onc).toBeNull();
    expect(s.waste).toBeGreaterThan(10);
    expect(s.cracks).toBeGreaterThan(3);
    expect(s.theme).toMatch(/Мёртвый Арсеньев|Брошенная деревня|Промзона|Пепельная тайга|Пустой микрорайон|Ночь пожаров|Свалка|Кислотный дождь|Сбежавший зоопарк/);

    // зверь на дороге — бешеный: перекрашенный, глаза красные
    const z = await page.evaluate(() => {
        const a = window.__raceDebug.spawnAnimal(20);
        let eye = null; a.mesh.traverse(o => { if (o.userData && o.userData.isEye) eye = o.material.color.getHex(); });
        return { zombie: !!a.mesh.userData.zombie, eye };
    });
    expect(z.zombie).toBe(true);
    if (z.eye != null) expect(z.eye).toBe(0xff2a1a);

    // гонится босс компании: плашка погони — про босса
    await page.evaluate(() => { clearInterval(window.__keep); const g = window.__raceDebug; g.police.crash(); });
    await expect(page.locator('body')).toContainText('БОСС НА ХВОСТЕ', { timeout: 5_000 });
    expect(problems).toEqual([]);
});
