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

**DevOps & Quality:**
- Docker + Docker Compose
- Jest + Testing Library
- ESLint + Husky (pre-commit hooks)
- Sentry (мониторинг ошибок)

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
│   └── admin/             # Админ-панель
├── api/
│   ├── auth/              # Регистрация/логин/логаут
│   └── data/              # CRUD API для сущностей
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
└── api-auth.ts           # API auth helpers

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

### Запуск проекта

#### Вариант 1: Docker (рекомендуется для сдачи)

```bash
# Сборка и запуск
docker-compose up --build

# Приложение доступно на http://localhost:3000
# PostgreSQL на порту 5432
```

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

### Безопасность

- Пароли хешируются bcrypt (12 salt rounds)
- Сессии в httpOnly cookies (недоступны для JS)
- SameSite=Lax для защиты от CSRF
- Secure flag в production
- Токены сессий хешируются SHA-256 перед сохранением
- Prisma защищает от SQL-инъекций

### Особенности реализации

1. **Server Components** - большинство страниц рендерятся на сервере
2. **TanStack Query** - кеширование на клиенте, фоновые обновления
3. **Optimistic UI** - мгновенный отклик при операциях
4. **Error Boundaries** - обработка ошибок без падения приложения
5. **Loading States** - скелетоны при загрузке данных
6. **Responsive Design** - адаптивная верстка для мобильных

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

### Лицензия
Дипломный проект для образовательных целей.
