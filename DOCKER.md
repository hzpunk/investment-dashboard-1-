# Docker Setup Guide

## 🚀 Быстрый старт

### Продакшен режим (всё в Docker)

```bash
# Запуск всего стека
./start.sh

# Или вручную:
docker-compose up --build
```

### Режим разработки (БД и Redis)

```bash
# Запуск инфраструктуры
./start.sh dev

# Локальная разработка
npm run dev
```

## 📋 Требования

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM минимум для приложения, БД и Redis. LM Studio запускается отдельно на Windows-машине в Tailscale.

## 🔧 Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| App | 3000 | Next.js приложение |
| PostgreSQL | 5432 | База данных |
| Redis | 6379 | Кеш |

## 🛠️ Команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Полный сброс (удалить данные)
docker-compose down -v

# Перезапуск
docker-compose restart

# Выполнить миграции вручную
docker exec investment-app npx prisma migrate deploy

# Зайти в контейнер
docker exec -it investment-app sh
```

## 🤖 AI Помощник

AI не запускается как Docker-сервис в этом проекте. Backend вызывает LM Studio через OpenAI-compatible endpoint из `OLLAMA_URL`; frontend обращается только к `/api/ai/chat`.

```bash
OLLAMA_URL=http://100.91.135.114:11434/v1
AI_MODEL="mistralai/mistral-7b-instruct-v0.3"
AI_FORCE_USER_ASSISTANT_ROLES="true"
```

## 🔐 Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| DATABASE_URL | postgresql://... | Подключение к БД |
| NODE_ENV | production | Режим работы |
| NEXT_PUBLIC_APP_URL | http://localhost:3000 | URL приложения |
| OLLAMA_URL | http://100.91.135.114:11434/v1 | Base URL OpenAI-compatible API LM Studio |
| AI_MODEL | mistralai/mistral-7b-instruct-v0.3 | Модель AI |
| AI_FORCE_USER_ASSISTANT_ROLES | true | Совместимость с LM Studio templates, которые принимают только роли user/assistant |

## 🐛 Отладка

```bash
# Проверить статус контейнеров
docker ps

# Проверить логи конкретного сервиса
docker-compose logs app
docker-compose logs db

# Health check
curl http://localhost:3000/api/health

# Проверить backend AI route после входа в приложение
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -b "session_token=..." \
  -d '{"message":"Сколько сейчас на моём счету?"}'
```
