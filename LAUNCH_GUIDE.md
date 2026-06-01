# 🚀 Инструкция по запуску InvestTrack

**Версия:** Дипломная сборка  
**Дата:** 24 апреля 2026

---

## 📋 Системные требования

### Минимальные:
- **macOS:** 12+ (Monterey) или Windows 10+/Linux
- **RAM:** 8 GB
- **Disk:** 10 GB свободного места
- **Docker Desktop:** Latest version
- **Node.js:** 20+ (если запуск без Docker)

### Рекомендуемые:
- **RAM:** 16 GB
- **SSD:** Для быстрой работы БД
- **Tailscale:** сервер должен видеть Windows-машину с LM Studio

---

## 🔧 Шаг 1: Установка Docker

### macOS:
1. Скачай Docker Desktop: https://www.docker.com/products/docker-desktop
2. Установи и запусти
3. Дождись зелёного индикатора "Engine running"

### Проверка:
```bash
docker --version
docker-compose --version
```

---

## 🗄️ Шаг 2: Запуск инфраструктуры

### 2.1. Перейди в папку проекта:
```bash
cd "/Users/hzpunk/Downloads/Desktop/investment-dashboard (1)"
```

### 2.2. Запусти Docker сервисы:
```bash
# Остановить старые контейнеры (если есть)
docker-compose -f docker-compose.dev.yml down

# Запустить PostgreSQL и Redis
docker-compose -f docker-compose.dev.yml up -d
```

### 2.3. Проверь статус:
```bash
docker-compose -f docker-compose.dev.yml ps
```

**Ожидаемый результат:**
```
NAME                STATUS          PORTS
investment-db-dev   Up (healthy)    0.0.0.0:5432->5432/tcp
investment-redis-dev Up (healthy)   0.0.0.0:6379->6379/tcp
```

---

## ⚙️ Шаг 3: Настройка окружения

### 3.1. Создай файл `.env.local`:
```bash
cat > .env.local << 'EOF'
# Database
DATABASE_URL="postgresql://investuser:investpass@localhost:5432/investment_dashboard"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Service
OLLAMA_URL="http://100.91.135.114:11434/v1"
AI_MODEL="mistralai/mistral-7b-instruct-v0.3"
AI_FORCE_USER_ASSISTANT_ROLES="true"

# Security
AUTH_SECRET="dev-secret-key-change-in-production"
EOF
```

### 3.2. Проверь создание:
```bash
cat .env.local
```

---

## 🗃️ Шаг 4: Настройка базы данных

### 4.1. Установи зависимости:
```bash
npm install
```

### 4.2. Сгенерируй Prisma клиент:
```bash
npx prisma generate
```

### 4.3. Примени миграции:
```bash
npx prisma db push --accept-data-loss
```

### 4.4. Проверь подключение:
```bash
npx prisma studio
# Откроется в браузере на http://localhost:5555
```

---

## 🤖 Шаг 5: Проверка LM Studio (Опционально)

**Важно:** LM Studio запускается на отдельной Windows-машине, подключенной через Tailscale. Модель должна быть загружена в LM Studio заранее.

### 5.1. Проверь endpoint:
```bash
./scripts/init-ai.sh
```

Или вручную:
```bash
curl -s http://100.91.135.114:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/mistral-7b-instruct-v0.3",
    "messages": [{ "role": "user", "content": "Say hello" }],
    "stream": false
  }'
```

**Готово когда:** ответ содержит `choices[0].message.content`.

---

## ▶️ Шаг 6: Запуск приложения

### 6.1. Запусти dev сервер:
```bash
npm run dev
```

### 6.2. Дождись компиляции:
```
✓ Ready on http://localhost:3000
```

### 6.3. Открой в браузере:
- **Приложение:** http://localhost:3000
- **Регистрация:** http://localhost:3000/register
- **Логин:** http://localhost:3000/login

---

## ✅ Шаг 7: Проверка работоспособности

### 7.1. Health Check:
```bash
curl http://localhost:3000/api/health
```

**Ожидаемый результат:**
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

### 7.2. Тестовая регистрация:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","username":"testuser"}'
```

**Ожидаемый результат:** `201 Created` с данными пользователя

### 7.3. Тестовый логин:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

---

## 🌐 Доступные URL

### Публичные:
| URL | Описание |
|-----|----------|
| http://localhost:3000 | Главная (редирект на login) |
| http://localhost:3000/login | Страница входа |
| http://localhost:3000/register | Регистрация |
| http://localhost:3000/legal | Юридические документы |
| http://localhost:3000/legal/privacy | Политика конфиденциальности |
| http://localhost:3000/legal/terms | Пользовательское соглашение |
| http://localhost:3000/legal/risks | Уведомление о рисках |

### Защищённые (требуют авторизации):
| URL | Описание |
|-----|----------|
| http://localhost:3000/dashboard | Главный дашборд |
| http://localhost:3000/accounts | Управление счетами |
| http://localhost:3000/assets | Активы |
| http://localhost:3000/portfolios | Портфели |
| http://localhost:3000/transactions | Транзакции |
| http://localhost:3000/goals | Финансовые цели |
| http://localhost:3000/analytics | Аналитика |

### API:
| URL | Описание |
|-----|----------|
| http://localhost:3000/api/health | Health check |
| http://localhost:3000/api/auth/me | Текущий пользователь |
| http://localhost:3000/api/analytics | Аналитика портфеля |

---

## 🐛 Устранение неполадок

### Проблема: "Port 5432 is already allocated"
**Решение:**
```bash
# Найти и остановить процесс
lsof -ti:5432 | xargs kill -9

# Или изменить порт в docker-compose.dev.yml
ports:
  - "5433:5432"  # Вместо 5432:5432
```

### Проблема: "DATABASE_URL not found"
**Решение:**
```bash
# Проверить файл
cat .env.local

# Пересоздать
echo 'DATABASE_URL="postgresql://investuser:investpass@localhost:5432/investment_dashboard"' > .env.local

# Перезапустить сервер
Ctrl+C
npm run dev
```

### Проблема: "Prisma Client not found"
**Решение:**
```bash
npx prisma generate
npx prisma db push --accept-data-loss
```

### Проблема: AI не отвечает
**Решение:**
```bash
# Проверить LM Studio OpenAI-compatible endpoint с сервера
./scripts/init-ai.sh

# Проверить переменные окружения backend
grep -E "OLLAMA_URL|AI_MODEL" .env.local
```

### Проблема: Docker не запускается
**Решение:**
```bash
# Проверить статус
docker info

# Перезапустить Docker Desktop
# Или через терминал:
killall Docker
open -a Docker
```

---

## 🛑 Остановка

### Остановить всё:
```bash
# Остановить Next.js
Ctrl+C в терминале с сервером

# Остановить Docker
docker-compose -f docker-compose.dev.yml down

# Или полная очистка
docker-compose -f docker-compose.dev.yml down -v
```

---

## 📱 Быстрый старт (TL;DR)

```bash
# 1. Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Env
echo 'DATABASE_URL="postgresql://investuser:investpass@localhost:5432/investment_dashboard"' > .env.local

# 3. DB
npm install
npx prisma generate
npx prisma db push --accept-data-loss

# 4. AI (опционально)
./scripts/init-ai.sh

# 5. Run
npm run dev

# 6. Open
open http://localhost:3000
```

---

## 📞 Поддержка

**Проблемы с запуском:**
1. Проверь Docker: `docker ps`
2. Проверь env: `cat .env.local`
3. Проверь логи: `docker-compose -f docker-compose.dev.yml logs`
4. Перезапусти всё с нуля

**Успешного запуска! 🎉**
