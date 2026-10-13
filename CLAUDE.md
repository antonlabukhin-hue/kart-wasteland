# Дорожный прорыв: Пустошь (kart-wasteland)

**Это экспериментальная копия.** Основная игра — `antonlabukhin-hue/kart-racer` (папка `Desktop/simple-kart-racer`). Здесь новый сценарий: разбитые машины вместо попуток, бешеные звери — главная угроза, босс компании вместо ГАИ, объезд по полю раз в 3000 м.
- Из основной игры можно подтягивать правки: `git fetch upstream` + `git merge upstream/main` (конфликты — по смыслу, эта версия главнее).
- Ключи localStorage — с префиксом `kw_`, кэш SW — `kart-wasteland-*`: на одном домене github.io версии не делят сохранения.
- Общая база Supabase отключена (`src/online-board.js` → `offline.invalid`), чтобы не смешивать рекорды и метрики с основной игрой. Своя база — позже.
- Порты сдвинуты (превью 4184/4186, dev 5183, e2e 4399/4499) — можно работать в обеих папках одновременно.

Браузерная гонка на Three.js + Vite. Сайт — GitHub Pages (`antonlabukhin-hue/kart-wasteland`), плюс сборки для Яндекс Игр, Electron (`desktop/`) и мобильных (`mobile/`).
Общение и коммиты — на русском.

## Карта кода
- `src/main.js` (~11.6k строк) — склейка: меню, гараж, `initGame` с игровым циклом. **Не читать целиком** — искать Grep по имени функции и читать окрестность.
  Ориентиры: `createProfile`, `renderGaragePartsPanel`, `startGaragePreview`, `refreshMapSelectUI`, `showAnimalShout`, `createCar`, `handleObstacleHit`, `showBossCard`, `isCampaignRun`, `closeGarage`.
- Остальное в `src/*.js` — модули с чистой логикой и юнит-тестами; таблица модулей — `src/ARCHITECTURE.md`.
- Данные: `src/data.js` (трассы, машины, звери), `src/content.js` (мета-контент), `src/locales/`.
- Стили — `css/style.css`. Доки — `docs/` (QA, RELEASE, YANDEX, METRICS…).

## Правила для кода
- Новую логику — в отдельный модуль (состояние параметрами, без `window.*`) + тест в `tests/unit/`. `tests/unit/architecture.test.js` ограничивает число строк `main.js` (`MAX_MAIN_LINES`).
- В `main.js` длинные строки с несколькими операторами: не дописывать `// комментарий` в середину строки — проглотит остаток. Только `/* */` или в самый конец.
- В `initGame` есть локальные `const track` и др. — импорт с таким же именем ловит TDZ (поэтому аналитика импортируется как `trackEvent`).
- Аналитика `track(name, props)`: имя события лежит в поле `e`, не называть проп `e`.
- Функции из `onclick=` в разметке должны оставаться на `window`.
- `python` здесь — заглушка Store; скриптовые правки делать через `node`. Диск C почти полный — чистить `%TEMP%\playwright_*profile-*` при ENOSPC.

## Сборки и тесты
- `npm run test:unit` — vitest, быстро.
- `npm run test:e2e:edge` — e2e в установленном Edge (Chromium для Playwright не скачивается). ~5 мин.
- `CI=1 npm run test:e2e:slow` — Edge без GPU, как CI; ~60 мин, запускать частями (см. скилл `release`).
- `npm run build:test` → `dist-test/` с `window.__raceDebug` и `window.__artKit`; превью — launch-конфиг `test-build` (порт 4184).
- `npm run art` (`ART_ONLY=...`) — рендеры картинок в `public/images`.
- e2e использует фиксированные порты 4399/4499 — не запускать два e2e-прогона параллельно.

## Процесс
- Работа в ветке `claude/<тема>`, один коммит на пункт (`feat(...)`/`fix(...)`, по-русски).
- Мерж в main и деплой — скилл `release`. Проверка визуала — скилл `visual-check`.
- `gh` CLI нет — статус Actions смотреть через публичный REST API curl'ом.
