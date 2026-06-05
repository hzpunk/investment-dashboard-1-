# InvestTrack - Инвестиционный дашборд
## Дипломный проект (Колледж)

### Описание проекта
Веб-приложение для управления инвестиционным портфелем с возможностями:
- Учет активов (акции, криптовалюты, облигации, ETF)
- Отслеживание транзакций (покупка/продажа/дивиденды)
- Аналитика портфеля (графики, распределение активов)
- Финансовые цели (целевые суммы, отслеживание прогресса)
- Ролевая система (user/admin)

### Технологический стек

**Backend & Database:**
- Next.js 15 (App Router, Server Components)
- PostgreSQL 16 (реляционная БД)
- Prisma ORM (миграции, типобезопасные запросы)
- bcryptjs (хеширование паролей)
- Session-based auth (httpOnly cookies)

**Frontend:**
- React 19 + TypeScript 5
- TailwindCSS 3.4
- shadcn/ui (Radix UI компоненты)
- TanStack Query (кеширование данных)
- Recharts (визуализация)
- React Hook Form + Zod (валидация)

**AI & ML:**
- LM Studio OpenAI-compatible API (локальная модель через Tailscale, только server-side)
- Mistral 7B Instruct v0.3 (AI консультант)
- Docker deployment

**DevOps & Quality:**
- Docker + Docker Compose (multi-stage build)
- Jest + Testing Library
- ESLint + Husky (pre-commit hooks)
- Sentry (мониторинг ошибок)
- Health checks (API + DB + Redis)

### Архитектура проекта

```
app/
├── (dashboard)/           # Группа защищенных маршрутов
│   ├── dashboard/         # Главная страница
│   ├── accounts/          # Управление счетами
│   ├── assets/            # Активы
│   ├── portfolios/        # Портфели
│   ├── transactions/      # Транзакции
│   ├── goals/             # Финансовые цели
│   ├── settings/          # Настройки профиля
│   ├── admin/             # Админ-панель
│   └── legal/             # Правовые документы
├── api/
│   ├── auth/              # Регистрация/логин/логаут
│   ├── data/              # CRUD API для сущностей
│   └── ai/                # AI консультант
├── login/                 # Страница входа
└── register/              # Регистрация

entities/                  # Бизнес-логика по domains
├── account/
├── asset/
├── portfolio/
├── transaction/
├── goal/
└── user/

lib/                       # Утилиты и клиенты
├── prisma.ts             # Prisma client
├── auth.ts               # Session management
├── password.ts           # Password hashing
├── api-auth.ts           # API auth helpers
└── api-handler.ts        # Centralized API helpers

docs/legal/                # Юридические документы
├── privacy-policy.md
├── terms-of-service.md
├── risk-disclosure.md
├── cookie-policy.md
└── personal-data-consent.md

prisma/
└── schema.prisma         # Модели БД
```

### Модели базы данных

**User** - Пользователи системы
- id, email, passwordHash, createdAt, updatedAt

**Profile** - Профили пользователей
- id, username, avatarUrl, role

**Session** - Сессии (httpOnly cookies)
- id, userId, tokenHash, expiresAt

**Account** - Инвестиционные счета
- id, userId, name, type, balance, currency

**Asset** - Торговые активы
- id, symbol, name, type, currentPrice, currency

**Transaction** - Операции
- id, userId, accountId, assetId, type, quantity, pricePerUnit, totalAmount, fee, date

**Portfolio** - Портфели активов
- id, userId, name, description

**PortfolioAsset** - Связь портфель-актив
- portfolioId, assetId, quantity, averageBuyPrice

**Goal** - Финансовые цели
- id, userId, name, targetAmount, currentAmount, targetDate

**Notification** - Уведомления системы
- id, userId, title, message, type, isRead, createdAt

**AuditLog** - Журнал аудита
- id, userId, action, entityType, entityId, details, createdAt

### Запуск проекта

#### Вариант 1: Docker (рекомендуется для сдачи)

```bash
# Быстрый запуск с помощью скрипта
./start.sh

# Или вручную
docker-compose up --build

# Приложение доступно на http://localhost:3000
# PostgreSQL на порту 5432
```

**Сервисы Docker:**
- `app` — Next.js приложение (порт 3000)
- `db` — PostgreSQL 16 (порт 5432)
- `redis` — кеш рыночных данных и расчетов (порт 6379)

AI работает через backend route `/api/ai/chat`, который обращается к LM Studio по `OLLAMA_URL` на сервере. Браузер не вызывает адрес локальной модели напрямую.

#### Вариант 2: Локальная разработка

```bash
# Установка зависимостей
pnpm install

# Генерация Prisma клиента
pnpm prisma generate

# Запуск миграций
pnpm prisma migrate dev

# Dev сервер
pnpm dev
```

### Тестирование

```bash
# Unit тесты
pnpm test

# Type checking
pnpm typecheck

# Линтинг
pnpm lint
```

### Структура аутентификации

1. **Регистрация** (`POST /api/auth/register`)
   - Валидация email/password
   - Хеширование bcrypt (12 rounds)
   - Создание профиля и роли
   - Установка httpOnly cookie (session)

2. **Вход** (`POST /api/auth/login`)
   - Проверка credentials
   - Создание сессии в БД
   - Cookie с session token

3. **Проверка сессии** (`GET /api/auth/me`)
   - Валидация cookie
   - Возврат данных пользователя

4. **Выход** (`POST /api/auth/logout`)
   - Удаление сессии из БД
   - Очистка cookie

### API Endpoints

**Auth:**
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Текущий пользователь

**Data (все требуют авторизации):**
- `GET /api/data/accounts` - Список счетов
- `GET /api/data/goals` - Цели
- `GET /api/data/portfolios` - Портфели
- `GET /api/data/portfolios/[id]/stats` - Статистика портфеля
- `GET /api/data/transactions/recent?limit=N` - Последние транзакции
- `POST /api/data/bootstrap` - Создание тестовых данных

**Advanced Features (Дипломные функции):**
- `GET /api/analytics` - Аналитика и метрики портфеля (доходность, CAGR, распределение)
- `GET /api/export?type=transactions|portfolio|tax-report&format=csv|json` - Экспорт данных
- `POST /api/import` - Импорт транзакций из CSV/JSON (брокерские выгрузки)
- `GET /api/dividends?year=2024` - Дивиденды и история выплат
- `POST /api/dividends` - Запись дивидендного платежа
- `GET /api/notifications` - Уведомления пользователя
- `GET /api/portfolio/rebalance` - Стратегии ребалансировки
- `POST /api/portfolio/rebalance` - Расчет ребалансировки с рекомендациями
- `POST /api/ai/chat` - AI консультант (LM Studio OpenAI-compatible, portfolio-aware)
- `GET /api/health` - Health check (проверка состояния сервисов)

### Безопасность

- Пароли хешируются bcrypt (12 salt rounds)
- Сессии в httpOnly cookies (недоступны для JS)
- SameSite=Lax для защиты от CSRF
- Secure flag в production
- Токены сессий хешируются SHA-256 перед сохранением
- Prisma защищает от SQL-инъекций
- Централизованный `withAuth` wrapper для API
- Atomic transactions через Prisma `$transaction`
- Health check endpoints для мониторинга
- Docker security: non-root user, minimal Alpine image

### Особенности реализации

1. **Server Components** - большинство страниц рендерятся на сервере
2. **TanStack Query** - кеширование на клиенте, фоновые обновления
3. **Optimistic UI** - мгновенный отклик при операциях
4. **Error Boundaries** - обработка ошибок без падения приложения
5. **Loading States** - скелетоны при загрузке данных
6. **Responsive Design** - адаптивная верстка для мобильных
7. **AI Assistant** - интегрированный AI консультант с контекстом портфеля
8. **Legal Compliance** - полное соответствие законодательству РФ (152-ФЗ)

### Демонстрационные данные

При первом входе система автоматически создает:
- Основной счет (Main Account, $10,000)
- Тестовый актив (AAPL)
- Портфель с активом
- Пример транзакции (покупка 5 AAPL)
- Финансовую цель (Emergency Fund, $20,000)

### Проверка работоспособности

```bash
# Проверка healthcheck
curl http://localhost:3000/api/auth/me

# Регистрация тестового пользователя
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","username":"testuser"}'
```

### Юридическое соответствие

Сервис соответствует требованиям законодательства РФ:

**152-ФЗ «О персональных данных»:**
- Политика конфиденциальности
- Согласие на обработку ПДн (интегрировано в регистрацию)
- Права субъекта ПДн

**Требования ЦБ РФ:**
- Уведомление о рисках (интегрировано в регистрацию)
- Отказ от ответственности за инвестиционные рекомендации
- AI консультант не даёт финансовых советов

**Документы:**
- `/legal` — обзор всех документов
- `/legal/privacy` — Политика конфиденциальности
- `/legal/terms` — Пользовательское соглашение
- `/legal/risks` — Уведомление о рисках
- `/legal/cookies` — Политика cookies
- `/legal/consent` — Согласие на обработку ПДн

### Лицензия
Дипломный проект для образовательных целей.


### API Response Contract

All JSON API routes use a unified envelope.

Success:
```json
{ "ok": true, "data": {}, "message": "Optional message", "meta": {} }
```

Error:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Safe public message", "details": {}, "requestId": "optional" } }
```

Frontend code should use `lib/api-client.ts` and map `error.code` to localized strings from `messages/ru.json` and `messages/en.json`. Backend responses must not expose raw SQL, provider errors, tokens, cookies, secrets, or internal infrastructure details to the browser.
## 2026 Analytics and Calculators Update

This iteration adds a production-style investment analytics layer:

- centralized finance formulas in `lib/finance`;
- normalized `/api/analytics` DTO with summary, performance, allocation, positions, risk and projections;
- real portfolio performance charts derived from transactions and current positions;
- redesigned allocation donut/table with grouping for small positions;
- `/calculators` page with investment, asset, business, VAT, ROI, break-even, tax and loan/mortgage calculators;
- AI portfolio context enriched with analytics, risk and projection metrics.

Calculations are approximate and are not financial, investment or tax advice.

## 2026 Data Export Module

The `/export` module adds `Выгрузка данных` / `Data export` to the sidebar. Users can choose sections, period, format, document options, review a stable summary of what will be exported, inspect per-section details, and download generated files. Browser print is intentionally removed from this module.

Implemented formats: PDF, DOCX, CSV, XLSX, XLS, ODS, TXT, JSON, XML, QIF, OFX, MT940, CAMT.053. Planned/disabled formats return clear 422 API errors and are disabled in the UI: HTML.

PDF and DOCX reports include selected investment data, metadata, the application link, QR code when available, and a disclaimer. PDF embeds Noto Sans TTF fonts for Cyrillic text, reserves a separate QR/link block, renders simple charts from export data, and validates the layout before returning the file. JSON is compact by default, with detailed projection points included only in detailed mode. See `EXPORT_REPORT.md` and `API_DOCUMENTATION.md` for the API contract, summary preview behavior, layout validation, security notes, and limitations.

### Data Export Presentation Layer

The export module now uses a user-facing presentation layer before file generation. PDF, DOCX, TXT, CSV, and XLSX receive localized report sections and headers instead of raw database/API field names. Examples: `Сводка портфеля`, `Стоимость портфеля`, `Счета`, `Название`, `Тип`, `Баланс` instead of `portfolioSummary`, `totalPortfolioValue`, `createdAt`, or `currentPrice`.

User-facing exports remove internal identifiers such as `id`, `key`, `assetId`, `portfolioId`, `accountId`, and `userId`. JSON export uses a compact public structure by default and omits QR base64/SVG, chart snapshots, raw DTO keys, and full projection point arrays unless detailed/technical mode is explicitly selected.

CSV export is Excel-friendly on Windows: files start with a UTF-8 BOM, use `;` as the delimiter, and normalize non-breaking spaces in formatted currency values. XLS, ODS, XML, QIF, OFX, MT940, and CAMT.053 are implemented in addition to PDF, DOCX, TXT, CSV, XLSX, and JSON. HTML remains planned/disabled with controlled API errors.

Financial exports focus on accounts and transactions. QIF supports personal-finance imports, OFX exports an XML-style account statement, MT940 exports a simplified SWIFT statement-like text file, and CAMT.053 exports a simplified ISO 20022 XML statement. These files are for portability/reporting/demo use and are not certified bank statements.
