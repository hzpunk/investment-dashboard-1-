# Нагрузочное тестирование k6

## Назначение

Нагрузочные тесты проверяют, что приложение `investment-dashboard` стабильно отвечает на безопасные параллельные запросы, сохраняет единый формат API-ответов и не падает при умеренной нагрузке. Тесты предназначены для локальной или staging-среды владельца проекта.

Используется локальный бинарный файл Grafana k6:

```powershell
.\k6.exe run .\tests\load\health.load.js
```

k6 cloud не используется.

## Структура

```text
tests/load/
  health.load.js
  api.load.js
  ai.load.js
  mixed-dashboard.load.js
  lib/config.js
  lib/helpers.js
```

## Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|------------|------------------------|----------|
| `BASE_URL` | `http://127.0.0.1:3000` | Адрес приложения |
| `SESSION_COOKIE` | пусто | Cookie авторизованной сессии, например `session_token=...` |
| `K6_VUS` | `5` | Количество виртуальных пользователей для обычных сценариев |
| `K6_DURATION` | `30s` | Длительность обычных сценариев |
| `K6_AI_VUS` | `1` | Количество VU для AI-сценария |
| `K6_AI_DURATION` | `20s` | Длительность AI-сценария |

Для Docker deployment на сервере приложение опубликовано локально на порту `3100`:

```powershell
$env:BASE_URL="http://127.0.0.1:3100"
```

Для Windows local dev:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
```

## Запуск на Windows

Health endpoint:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
.\k6.exe run .\tests\load\health.load.js
```

API contract:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
.\k6.exe run .\tests\load\api.load.js
```

Mixed dashboard read-only flow:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
.\k6.exe run .\tests\load\mixed-dashboard.load.js
```

AI route, unauthenticated contract check:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
.\k6.exe run .\tests\load\ai.load.js
```

AI route, authenticated minimal request:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
$env:SESSION_COOKIE="session_token=..."
.\k6.exe run .\tests\load\ai.load.js
```

PowerShell wrappers are also available:

```powershell
.\scripts\load-health.ps1
.\scripts\load-api.ps1
.\scripts\load-mixed.ps1
.\scripts\load-ai.ps1
```

## pnpm scripts

```powershell
pnpm run test:load:health
pnpm run test:load:api
pnpm run test:load:mixed
pnpm run test:load:ai
```

When using pnpm scripts with env vars in PowerShell:

```powershell
$env:BASE_URL="http://127.0.0.1:3100"
pnpm run test:load:health
```

## Сценарии

### `health.load.js`

- `GET /api/health`
- Проверяет HTTP 200.
- Проверяет JSON.
- Проверяет unified success shape `{ ok: true, data: ... }`.
- Нагрузка: ramp-up 10s, 5 VU, ramp-down 10s.

### `api.load.js`

- `GET /api/health`
- `GET /api/data/accounts`
- `GET /api/data/assets/00000000-0000-0000-0000-000000000000`
- Без `SESSION_COOKIE` protected endpoint должен вернуть `401 UNAUTHORIZED` в едином формате.
- С `SESSION_COOKIE` read-only endpoints должны возвращать успешный единый формат.

### `mixed-dashboard.load.js`

- `GET /`
- `GET /api/health`
- `GET /api/data/assets`
- Между запросами используется `sleep(1)`.
- AI-запросы и destructive операции не выполняются.

### `ai.load.js`

- `POST /api/ai/chat`
- Body: `{ "message": "Say hello" }`
- Без `SESSION_COOKIE` проверяет безопасный `401 UNAUTHORIZED`.
- С `SESSION_COOKIE` выполняет минимальный authenticated AI request.
- По умолчанию только `1 VU` и `20s`.

## Thresholds

Обычные endpoint tests:

```js
http_req_failed: ["rate<0.01"]
http_req_duration: ["p(95)<500"]
```

API/mixed сценарии используют более мягкий threshold:

```js
http_req_failed: ["rate<0.02"]
http_req_duration: ["p(95)<1500"]
```

AI scenario intentionally relaxed:

```js
http_req_failed: ["rate<0.05"]
http_req_duration: ["p(95)<120000"]
```

## Ограничения и безопасность

- Не запускать высокую нагрузку против production-сервера без отдельного разрешения.
- Не запускать AI-сценарий с высокой конкуррентностью: LM Studio работает на отдельном Windows PC через Tailscale, а локальная модель отвечает медленно.
- Не передавать реальные cookie или секреты в git.
- Не выполнять destructive операции под нагрузкой.
- Тесты не удаляют пользователей, не меняют роли, не создают транзакции и не вызывают Tailscale IP напрямую.
- AI test вызывает только backend route `/api/ai/chat`.
