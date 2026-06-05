# Отчёт о тестировании investment-dashboard

## Цели тестирования

Цель тестирования — подтвердить корректность работы инвестиционного дашборда, включая авторизацию, пользовательские и административные функции, операции с активами, единый формат API-ответов, i18n и AI-ассистента, который обращается к LM Studio только через серверный route `/api/ai/chat`.

## Инструменты тестирования

- Jest — модульные и интеграционные тесты.
- React Testing Library — тестирование UI-компонентов в JSDOM.
- Mock `fetch` — изоляция API-клиента и AI-клиента от реальной сети.
- Mock Prisma/market-data сервисов — проверка AI portfolio context без обращения к PostgreSQL, Redis и внешним API.
- Live smoke scripts — ручная проверка запущенного приложения через `scripts/test-health.js`, `scripts/test-api.js`, `scripts/test-ai.js`.

Selenium/Playwright в автоматическую часть не добавлялись, так как в проекте уже настроен Jest и React Testing Library. Для дипломной проверки UI сценарии описаны как ручные тест-кейсы, а ключевые элементы AI-ассистента покрыты автоматическими UI-тестами.

## Тестовая среда

- ОС разработки: Windows.
- Runtime: Node.js 20.
- Framework: Next.js 15.
- База данных: PostgreSQL через Prisma.
- Кэш: Redis.
- AI: LM Studio OpenAI-compatible API через backend route `/api/ai/chat`.
- Локализация: `messages/ru.json`, `messages/en.json`.

## Автоматизированное тестирование

Запуск полного набора:

```bash
pnpm test
```

Дополнительные группы:

```bash
pnpm run test:api
pnpm run test:ai
pnpm run test:i18n
pnpm run test:ui
pnpm run test:unit
```

Live smoke checks требуют запущенного приложения:

```bash
APP_BASE_URL=http://127.0.0.1:3000 pnpm run test:live:health
APP_BASE_URL=http://127.0.0.1:3000 pnpm run test:live:api
APP_BASE_URL=http://127.0.0.1:3000 SESSION_COOKIE="session_token=..." pnpm run test:live:ai
```

## Покрытие автоматическими тестами

- `__tests__/api/api-response.test.ts` — единый формат `apiSuccess()` и `apiError()`, HTTP-статусы, error codes.
- `__tests__/api/api-client.test.ts` — `apiFetch()`, typed errors, non-JSON response, network errors, i18n fallback.
- `__tests__/validation/validation.test.ts` — email, AI message, history, outgoing AI messages, truncation context.
- `__tests__/ai/openai-compatible-client.test.ts` — mocked LM Studio responses, provider 400, timeout, empty response, missing config, request body.
- `__tests__/ai/portfolio-context.test.ts` — portfolio context with mocked Prisma/market data, empty context, stale BTC price, no secrets.
- `__tests__/i18n/messages.test.ts` — наличие обязательных ключей и синхронизация RU/EN.
- `__tests__/ui/ai-assistant.test.tsx` — empty state, quick prompts, disabled send, Enter/Shift+Enter, loading, success/error display, no direct Tailscale URL.

## Таблица – Результаты тестирования авторизации пользователей

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Авторизация обычного пользователя | Открыть `/login`, ввести email и пароль, нажать вход | `user@example.com` / `User12345!` | Пользователь переходит на dashboard | Пройдено |
| 2 | Авторизация администратора | Открыть `/login`, ввести данные администратора | `admin@example.com` / `Admin12345!` | Администратор получает доступ к admin section | Пройдено |
| 3 | Авторизация с неверным email | Ввести несуществующий email и корректный пароль | `missing@example.com` / `User12345!` | Отображается локализованная ошибка | Пройдено |
| 4 | Авторизация с неверным паролем | Ввести существующий email и неверный пароль | `user@example.com` / `wrong-password` | Вход запрещён, форма не падает | Пройдено |
| 5 | Авторизация с пустыми полями | Нажать вход без заполнения формы | Пустые поля | Browser/form validation не отправляет некорректный запрос | Пройдено |
| 6 | Некорректный формат email | Ввести строку без формата email | `not-email` | Поле email не проходит HTML validation | Пройдено |
| 7 | Выход из аккаунта | Нажать logout | Активная сессия | Сессия удаляется, пользователь выходит | Пройдено |
| 8 | Доступ к защищённой странице без авторизации | Открыть `/dashboard` без cookie | Нет session cookie | Доступ запрещён или redirect/login state | Пройдено |

## Таблица – Результаты тестирования пользовательского функционала

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Просмотр дашборда | Авторизоваться и открыть `/dashboard` | Тестовый пользователь | Основные блоки дашборда отображаются | Пройдено |
| 2 | Просмотр инвестиционного портфеля | Открыть раздел портфелей | Портфель с активами | Видны активы, стоимость и структура | Пройдено |
| 3 | Просмотр списка активов | Открыть `/assets` | Каталог активов | Список активов отображается | Пройдено |
| 4 | Добавление актива | Заполнить форму добавления актива | `AAPL`, акция, цена `190` | Актив создаётся, API возвращает `ok: true` | Пройдено |
| 5 | Добавление актива с пустыми полями | Отправить пустую форму | Пустые поля | Отображается validation error | Пройдено |
| 6 | Некорректная цена | Ввести отрицательную или нечисловую цену | `-10`, `abc` | Форма/API отклоняют данные | Пройдено |
| 7 | Обновление цен | Нажать кнопку обновления цен | Каталог активов | Запрос выполняется, UI показывает результат | Пройдено |
| 8 | Пустое состояние | Открыть раздел без данных | Новый пользователь | Показано понятное empty state | Пройдено |

## Таблица – Результаты тестирования операций с активами и портфелем

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Добавление акции | Создать актив типа `stock` | `AAPL`, `Apple Inc.` | Акция добавлена в каталог | Пройдено |
| 2 | Добавление криптоактива | Создать актив типа `crypto` | `BTC`, `Bitcoin` | Криптоактив добавлен | Пройдено |
| 3 | Добавление ETF/облигации | Создать актив типа `etf` или `bond` | `VOO`, `US Treasury Bond` | Инструмент добавлен | Пройдено |
| 4 | Редактирование актива | Изменить название или цену | `AAPL`, цена `195` | Данные актива обновлены | Пройдено |
| 5 | Удаление актива | Нажать delete и подтвердить | Тестовый актив | Актив удалён или ошибка показана корректно | Пройдено |
| 6 | Поиск актива | Ввести тикер в поле поиска | `BTC` | Список фильтруется по запросу | Пройдено |
| 7 | Перерасчёт структуры портфеля | Добавить/изменить позицию | Портфель с несколькими активами | Проценты allocation пересчитаны | Пройдено |
| 8 | Диаграмма распределения | Открыть portfolio allocation | Активы разных типов | Диаграмма отображает распределение | Пройдено |

## Таблица – Результаты тестирования административного функционала

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Просмотр списка пользователей | Войти как admin и открыть `/admin/users` | Admin session | Таблица пользователей отображается | Пройдено |
| 2 | Изменение роли пользователя | Выбрать новую роль в таблице | `user` -> `premium` | Роль обновляется, API возвращает `ok: true` | Пройдено |
| 3 | Блокировка пользователя | Выполнить административное действие блокировки, если включено | Тестовый пользователь | Пользователь ограничен в доступе | Требует ручной проверки, если функция включена |
| 4 | Разблокировка пользователя | Снять блокировку, если включено | Тестовый пользователь | Пользователь снова может войти | Требует ручной проверки, если функция включена |
| 5 | Доступ обычного пользователя к admin section | Войти как user и открыть `/admin/users` | User session | Показано “Доступ запрещён” | Пройдено |
| 6 | Единый формат ошибок API | Вызвать admin API без прав | User session | Ответ `{ ok:false, error:{ code:"FORBIDDEN" } }` | Пройдено |

## Таблица – Результаты тестирования API

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Health endpoint | Выполнить `GET /api/health` | Нет | Ответ `ok: true`, данные состояния сервисов | Пройдено |
| 2 | Единый формат успешного ответа | Вызвать успешный API route | Авторизованный запрос | `{ ok:true, data:{...} }` | Пройдено |
| 3 | Единый формат ошибки | Отправить некорректный запрос | Неверный body | `{ ok:false, error:{ code, message } }` | Пройдено |
| 4 | 401 без авторизации | Вызвать protected endpoint без cookie | Нет session cookie | HTTP 401, code `UNAUTHORIZED` | Пройдено |
| 5 | Validation error | Отправить пустые обязательные поля | `{}` | HTTP 400, code `VALIDATION_ERROR` или `BAD_REQUEST` | Пройдено |
| 6 | Stable error code | Проверить `error.code` | Любая ошибка API | Код из централизованного списка | Пройдено |
| 7 | JSON response shape | Проверить поля ответа | API response | Есть `ok`, `data` или `error` | Пройдено |
| 8 | Несуществующий ресурс | Запросить отсутствующий id | UUID отсутствующего объекта | HTTP 404, code `NOT_FOUND` | Пройдено |

Пример успешного ответа:

```json
{
  "ok": true,
  "data": {},
  "message": "..."
}
```

Пример ошибки:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

## Таблица – Результаты тестирования AI-ассистента

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Простое сообщение | Открыть ассистента и отправить `Say hello` | `Say hello` | Ответ отображается в чате | Покрыто Jest UI и live script |
| 2 | Анализ портфеля | Отправить quick prompt | `Проанализируй мой портфель` | Ответ использует portfolio context или честно сообщает об отсутствии данных | Покрыто ручной проверкой |
| 3 | Баланс счёта | Отправить вопрос о счёте | `Сколько сейчас на моём счету?` | Ответ основан на accounts context | Покрыто ручной проверкой |
| 4 | Курс биткоина | Отправить вопрос о BTC | `Какой сейчас курс биткоина?` | Используется market data или сообщение о недоступности цены | Покрыто mocked portfolio-context test |
| 5 | Frontend не вызывает Tailscale IP | Проверить вызов в UI test/network tab | `100.91.135.114` | Browser вызывает только `/api/ai/chat` | Покрыто Jest UI |
| 6 | LM Studio недоступна | Смоделировать network error | Mock fetch rejection | API возвращает `AI_PROVIDER_UNAVAILABLE` | Покрыто Jest AI |
| 7 | Timeout | Смоделировать AbortError | `timeoutMs: 5` | API/client возвращает timeout error | Покрыто Jest AI |
| 8 | Пустой ответ модели | Вернуть blank content | `choices[0].message.content = " "` | Возвращается `AI_EMPTY_RESPONSE`/typed error | Покрыто Jest AI |
| 9 | Извлечение ответа | Вернуть OpenAI-compatible response | `choices[0].message.content` | Текст берётся из правильного поля | Покрыто Jest AI |
| 10 | Portfolio context без секретов | Построить mocked context | Accounts/assets/transactions | JSON context не содержит password/token/cookie/secret | Покрыто Jest AI |
| 11 | Fallback при unavailable context | Смоделировать сбой context builder | DB/service error | Chat не падает целиком, модель получает предупреждение | Покрыто архитектурно и ручной проверкой |
| 12 | i18n ошибки AI | Смоделировать `AI_PROVIDER_UNAVAILABLE` | API error code | UI показывает RU/EN localized text | Покрыто Jest UI/i18n |

## Таблица – Результаты тестирования i18n и UI-сообщений

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Русская локализация ошибок API | Проверить `messages/ru.json` | `api.errors.*` | Все обязательные ключи существуют | Покрыто Jest i18n |
| 2 | Английская локализация ошибок API | Проверить `messages/en.json` | `api.errors.*` | Все обязательные ключи существуют | Покрыто Jest i18n |
| 3 | Отсутствие hardcoded AI error text | Смоделировать ошибку AI | `AI_PROVIDER_UNAVAILABLE` | UI берёт текст из i18n | Покрыто Jest UI |
| 4 | Fallback на UNKNOWN_ERROR | Запросить неизвестный код | `MISSING_KEY` | Показан `UNKNOWN_ERROR` | Покрыто Jest API client |
| 5 | Локализация quick prompts | Открыть AI assistant | RU/EN locale | Quick prompts переведены | Покрыто Jest UI/i18n |
| 6 | Loading/retry/empty states | Проверить основные UI states | Нет данных / pending request | Тексты локализованы | Покрыто Jest UI и ручной проверкой |

## Таблица – Результаты тестирования Redis/PostgreSQL/Prisma

| № | Тест-кейс | Шаги выполнения | Тестовые данные | Ожидаемый результат | Фактический результат |
|---|-----------|-----------------|-----------------|---------------------|----------------------|
| 1 | Подключение Prisma к PostgreSQL | Запустить приложение и health check | `DATABASE_URL` | DB status доступен | Проверяется live health |
| 2 | Применение миграций | Выполнить Prisma migrate/deploy | Миграции проекта | Схема БД актуальна | Ручная проверка при деплое |
| 3 | Seed test users | Запустить seed, если требуется | `user@example.com`, `admin@example.com` | Пользователи созданы | Ручная проверка |
| 4 | Запись auditLog | Выполнить AI chat/admin action | Авторизованный пользователь | Создаётся запись auditLog | Ручная проверка через БД |
| 5 | Redis ping | Выполнить `pnpm run redis:ping` | `REDIS_URL` | Redis отвечает `PONG` | Ручная/live проверка |
| 6 | Cache read/write | Запросить market data | Redis enabled | Значения читаются/пишутся в cache | Ручная проверка |
| 7 | Fallback при недоступности Redis | Отключить Redis/cache | `CACHE_ENABLED=false` или Redis offline | Приложение не падает, использует fallback | Ручная проверка |
| 8 | Market data cache | Запросить BTC/crypto price | `BTC` | Цена берётся из provider/cache или помечается unavailable/stale | Покрыто mocked context и ручной проверкой |

## Ограничения

- Selenium/Playwright не используются в автоматической части.
- Live scripts требуют запущенного приложения и, для AI authenticated smoke check, session cookie.
- Тесты AI-клиента не вызывают реальную LM Studio/Tailscale сеть; все provider responses мокируются.
- Глубокие сценарии PostgreSQL/Redis проверяются live/manual тестами, чтобы не требовать отдельной тестовой БД в unit suite.

## Нагрузочное тестирование

### Цель

Цель нагрузочного тестирования — проверить устойчивость приложения при умеренной параллельной нагрузке, убедиться в корректной работе health/API endpoints, едином формате API-ответов и безопасной обработке защищённых маршрутов без авторизации. Отдельный AI-сценарий сделан консервативным, так как локальная LLM работает через LM Studio на отдельном Windows-компьютере через Tailscale.

### Инструмент

Для нагрузочного тестирования используется Grafana k6 в локальном режиме. В проект добавлен локальный бинарный файл `k6.exe`; k6 cloud не используется.

### Тестовая среда

- Windows local dev: `BASE_URL=http://127.0.0.1:3000`.
- Docker/server deployment: `BASE_URL=http://127.0.0.1:3100`.
- Обычная нагрузка по умолчанию: `5 VU`, `30s`.
- AI-нагрузка по умолчанию: `1 VU`, `20s`.
- Авторизация передаётся только через переменную окружения `SESSION_COOKIE`.

### Команды запуска

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
pnpm run test:load:health
pnpm run test:load:api
pnpm run test:load:mixed
```

Для серверного Docker deployment:

```powershell
$env:BASE_URL="http://127.0.0.1:3100"
pnpm run test:load:health
```

Для authenticated AI smoke/load check:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
$env:SESSION_COOKIE="session_token=..."
pnpm run test:load:ai
```

### Метрики и thresholds

- `http_req_failed` — доля неуспешных HTTP-запросов.
- `http_req_duration` — время ответа HTTP-запросов.
- `checks` — доля успешно пройденных проверок k6.
- Для health endpoint: `http_req_failed rate<0.01`, `p(95)<500ms`.
- Для API/mixed read-only сценариев: `http_req_failed rate<0.02`, `p(95)<1500ms`.
- Для AI endpoint: `http_req_failed rate<0.05`, `p(95)<120000ms`.

### Таблица – Результаты нагрузочного тестирования

| № | Сценарий | Endpoint / маршрут | Нагрузка | Метрики | Ожидаемый результат | Фактический результат | Статус |
|---|----------|--------------------|----------|---------|---------------------|----------------------|--------|
| 1 | Health endpoint | `GET /api/health` | 5 VU, ramp-up 10s, hold 20s, ramp-down 10s | `http_req_failed`, `http_req_duration`, `checks` | HTTP 200, JSON, `{ ok:true }`, p95 ниже threshold | Подготовлено к запуску | Готово |
| 2 | API unified response contract | `GET /api/health`, `GET /api/data/accounts` | 5 VU, 30s | `checks`, error rate | API возвращает единый формат success/error | Подготовлено к запуску | Готово |
| 3 | Protected endpoint без auth | `GET /api/data/accounts` без `SESSION_COOKIE` | 5 VU, 30s | status, checks | HTTP 401, `{ ok:false, error.code:"UNAUTHORIZED" }` | Подготовлено к запуску | Готово |
| 4 | Mixed dashboard read-only flow | `/`, `/api/health`, `/api/data/assets` | 5 VU, 30s, `sleep(1)` | p95, error rate | Сервис не падает, read-only маршруты отвечают ожидаемо | Подготовлено к запуску | Готово |
| 5 | AI assistant minimal authenticated request | `POST /api/ai/chat` с `SESSION_COOKIE` | 1 VU, 20s | p95 до 120s, checks | `{ ok:true, data.message:string }` или контролируемая provider error | Не запускалось без session cookie | Опционально |
| 6 | AI assistant unauthenticated request | `POST /api/ai/chat` без `SESSION_COOKIE` | 1 VU, 20s | status, checks | HTTP 401, `{ ok:false, error.code:"UNAUTHORIZED" }` | Подготовлено к запуску | Готово |
| 7 | Redis/cache read scenario | Через `/api/health` и market/cache dependent routes | 5 VU, 30s | p95, error rate | Redis/cache не вызывает падение приложения | Подготовлено к ручной/live проверке | Готово |
| 8 | Market-data read-only scenario | `/api/market/crypto-prices` или read-only market route | 1-5 VU, короткий запуск | p95, error rate | Нет агрессивного обращения к external API, graceful fallback | Подготовлено к ручной настройке | Опционально |

### Ограничения

- Нагрузочные тесты не выполняют delete/update/admin-role операции.
- AI-сценарий не входит в mixed flow и не запускается с высокой конкуррентностью.
- k6 scripts не вызывают Tailscale IP или LM Studio напрямую; используется только backend route `/api/ai/chat`.
- Реальные cookie и секреты не хранятся в репозитории и передаются только через переменные окружения.
## 2026-06-04 Analytics/Calculators Verification

Added pure finance formula tests:

- `__tests__/finance/calculations.test.ts`
- `__tests__/finance/projections.test.ts`
- `__tests__/finance/calculators.test.ts`

Verified commands during this iteration:

```bash
pnpm run test:finance
pnpm test
pnpm run test:i18n
pnpm typecheck
```

Current automated result after build validation:

- 11 Jest suites passed.
- 48 tests passed.
- i18n RU/EN key parity passed.
- TypeScript typecheck passed.
- Next.js production build passed.
- Docker Compose app image build passed.

## 2026-06-04 Data Export Verification

Added export tests:

- `__tests__/export/app-link.test.ts`
- `__tests__/export/layout-validator.test.ts`
- `__tests__/export/formatters.test.ts`
- `__tests__/export/qr-code.test.ts`
- `__tests__/export/csv.test.ts`
- `__tests__/export/xlsx.test.ts`
- `__tests__/export/pdf-layout.test.ts`
- `__tests__/export/export-data.test.ts`
- `__tests__/export/export-route.test.ts`
- `__tests__/ui/export-page.test.tsx`

Additional script:

```bash
pnpm run test:export
```

Covered behavior: export request validation, no sections selected, planned format errors, app link resolution, QR fallback, PDF layout validation, page-break checks, CSV escaping, TXT/JSON generation, XLSX sheets, PDF generation smoke check, safe data collection with no secrets, export API auth requirement, and export page preview/print interactions.

Final automated result for this iteration:

- `pnpm run test:export`: 9 suites passed, 19 tests passed.
- `pnpm test`: 21 suites passed, 69 tests passed.
- `pnpm run test:i18n`: 1 suite passed, 3 tests passed.
- `pnpm typecheck`: passed.
- `pnpm run build`: passed and includes `/export`, `/api/export`, `/api/export/preview`.
- `docker compose -f docker-compose.server.yml build app`: passed.
- Browser verification: `/export` opened on `http://127.0.0.1:3001/export`, sidebar label rendered as `Выгрузка данных`, and Preview generated a document preview for the seeded demo user.

## 2026-06-04 Data Export Stabilization Verification

Updated and added export tests:

- `__tests__/export/export-request-validation.test.ts`
- `__tests__/export/format-support.test.ts`
- `__tests__/export/export-route.test.ts`
- `__tests__/export/layout-validator.test.ts`
- `__tests__/ui/export-page.test.tsx`

Covered behavior: strict request validation, empty sections, unsupported format 422, planned format 422, PDF/CSV binary response headers, summary preview endpoint, export button click-only behavior, planned formats disabled in UI, QR/link layout separation, footer collision detection, and summary preview print flow.

Automated result after stabilization:

- `pnpm test`: 23 suites passed, 84 tests passed.
- Local authenticated API smoke on `http://127.0.0.1:3001`: `pdf`, `csv`, `xlsx`, `json` returned 200 with expected content types; `ods` returned 422 `EXPORT_FORMAT_NOT_IMPLEMENTED`; unknown `bad` returned 422 `EXPORT_FORMAT_NOT_SUPPORTED`; `/api/export/summary` returned `{ ok:true, data.summary }`.

Additional validation completed:

- `pnpm run test:i18n`: 1 suite passed, 3 tests passed.
- `pnpm typecheck`: passed.
- `pnpm run build`: passed and includes `/export`, `/api/export`, `/api/export/preview`, `/api/export/summary`.
- `docker compose -f docker-compose.server.yml build app`: passed.
- Browser verification on `http://127.0.0.1:3001/export`: planned formats are visible and disabled, Preview updates the `Что будет выгружено` summary with record counts, and the page shows the chart-as-table warning instead of a document-like preview.
## 2026-06-05 Data Export Stabilization Verification

Added and updated export tests:

- `__tests__/export/pdf-font.test.ts`
- `__tests__/export/date-format.test.ts`
- `__tests__/export/svg-charts.test.ts`
- `__tests__/export/json-export.test.ts`
- `__tests__/export/warnings.test.ts`
- `__tests__/ui/export-page.test.tsx`

Covered behavior: Cyrillic-capable PDF font assets, PDF generation without ASCII replacement artifacts, QR-safe layout through existing validator coverage, removed Print button, clickable section detail rows, RU/EN human-readable dates, SVG chart generation from allocation/performance data, format-aware chart warnings, compact JSON without projection `points`, detailed JSON with projection `points`, and preview summary behavior that does not call the binary export endpoint.

Focused pre-validation result:

- `pnpm test -- __tests__/export/date-format.test.ts __tests__/export/svg-charts.test.ts __tests__/export/json-export.test.ts __tests__/export/pdf-font.test.ts __tests__/export/warnings.test.ts __tests__/ui/export-page.test.tsx`: 6 suites passed, 15 tests passed.

Final validation result:

- `pnpm test`: 28 suites passed, 97 tests passed.
- `pnpm run test:export`: 16 suites passed, 47 tests passed.
- `pnpm run test:i18n`: 1 suite passed, 3 tests passed.
- `pnpm typecheck`: passed.
- `pnpm run build`: passed and includes `/export`, `/api/export`, `/api/export/summary`.
- `docker compose -f docker-compose.server.yml build app`: passed on retry. The first run compiled successfully but hit a transient Docker snapshot extraction error while exporting the image.

## 2026-06-05 Data Export CSV/XLS/ODS/XML Verification

Added and updated export tests:

- `__tests__/export/csv-encoding.test.ts`
- `__tests__/export/xls-export.test.ts`
- `__tests__/export/ods-export.test.ts`
- `__tests__/export/xml-export.test.ts`
- `__tests__/export/format-support.test.ts`
- `__tests__/export/export-request-validation.test.ts`
- `__tests__/export/export-route.test.ts`
- `__tests__/export/csv-headers.test.ts`

Covered behavior: CSV UTF-8 BOM for Windows Excel, semicolon CSV delimiter, no mojibake snippets, no NBSP/narrow-NBSP in CSV cells, readable Cyrillic CSV headers, true XLS workbook generation via `xlsx`/BIFF8, ODS workbook generation, clean public XML with escaping, implemented format registry for XLS/ODS/XML, then-current planned financial format behavior, and continued sanitization of internal IDs/DTO fields.

Validation result:

- `pnpm run test:export`: 26 suites passed, 59 tests passed.
- `pnpm test`: 38 suites passed, 109 tests passed.
- `pnpm run test:i18n`: 1 suite passed, 3 tests passed.
- `pnpm typecheck`: passed.
- `pnpm run build`: passed and includes `/export`, `/api/export`, `/api/export/summary`.
- `docker compose -f docker-compose.server.yml build app`: passed.

## 2026-06-05 Data Export Financial Formats Verification

Added and updated tests:

- `__tests__/export/qif-export.test.ts`
- `__tests__/export/ofx-export.test.ts`
- `__tests__/export/mt940-export.test.ts`
- `__tests__/export/camt053-export.test.ts`
- `__tests__/export/financial-formats.test.ts`
- `__tests__/export/format-support.test.ts`
- `__tests__/export/export-request-validation.test.ts`
- `__tests__/export/export-route.test.ts`

Covered behavior: QIF investment/bank records with BOM and `^` terminators, OFX XML statement entries, MT940 mandatory tags and debit/credit marks, CAMT.053 ISO 20022 namespace and entries, correct MIME types, implemented registry status for QIF/OFX/MT940/CAMT.053, generated safe references instead of database IDs, financial formats ignoring visual sections with `FINANCIAL_SECTIONS_ONLY`, and no leaks of `assetId`, `accountId`, `portfolioId`, `userId`, `qrCodeDataUrl`, or `projectionDefaults`.

Focused validation:

- `pnpm run test:export`: 31 suites passed, 67 tests passed.

Final validation:

- `pnpm test`: 43 suites passed, 117 tests passed.
- `pnpm run test:i18n`: 1 suite passed, 3 tests passed.
- `pnpm typecheck`: passed.
- `pnpm run build`: passed and includes `/export`, `/api/export`, `/api/export/summary`.
- `docker compose -f docker-compose.server.yml build app`: passed.
- `docker compose -f docker-compose.server.yml build app`: passed.
- Browser note: `http://127.0.0.1:3001/export` responded with HTTP 200, but the in-app browser session stayed on the app loading spinner without console errors; UI behavior is covered by `__tests__/ui/export-page.test.tsx`.

## 2026-06-05 Data Export Presentation Verification

Added and updated export privacy/presentation tests:

- `__tests__/export/presentation-mapping.test.ts`
- `__tests__/export/export-sanitization.test.ts`
- `__tests__/export/json-public-export.test.ts`
- `__tests__/export/csv-headers.test.ts`
- `__tests__/export/xlsx-headers.test.ts`
- `__tests__/export/pdf-labels.test.ts`
- `__tests__/export/csv.test.ts`
- `__tests__/export/xlsx.test.ts`
- `__tests__/export/json-export.test.ts`
- `__tests__/ui/export-page.test.tsx`

Covered behavior: localized report labels, localized enum values, no raw DTO headers in generated section models, no internal IDs or allocation `key` leakage in user-facing rows, compact public JSON without QR/chart/internal projection payloads, localized CSV headers, localized XLSX sheet names and headers, PDF renderer fed from the presentation view model, and export summary/details UI using human-readable fields.

Validation result for this iteration:

- `pnpm run test:export`: 22 suites passed, 54 tests passed.
- `pnpm run test:ui`: 2 suites passed, 8 tests passed.
- `pnpm run test:i18n`: 1 suite passed, 3 tests passed.
- `pnpm test`: 34 suites passed, 104 tests passed.
- `pnpm typecheck`: passed.
- `pnpm run build`: passed and includes `/export`, `/api/export`, `/api/export/summary`.
