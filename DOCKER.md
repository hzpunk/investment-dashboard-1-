# Docker Setup Guide

## 🚀 Быстрый старт

### Продакшен режим (всё в Docker)

```bash
# Запуск всего стека
./start.sh

# Или вручную:
docker-compose up --build
```

### Режим разработки (только БД и AI)

```bash
# Запуск инфраструктуры
./start.sh dev

# Локальная разработка
npm run dev
```

## 📋 Требования

- Docker 20.10+
- Docker Compose 2.0+
- 6GB RAM минимум (4GB для AI + 2GB для приложения)

## 🔧 Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| App | 3000 | Next.js приложение |
| PostgreSQL | 5432 | База данных |
| Ollama AI | 11434 | AI модель Mistral 7B |

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

При первом запуске модель скачивается автоматически (около 4GB):

```bash
# Проверить статус AI
docker exec investment-ai ollama list

# Скачать модель вручную
docker exec investment-ai ollama pull mistral:7b
```

## 🔐 Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| DATABASE_URL | postgresql://... | Подключение к БД |
| NODE_ENV | production | Режим работы |
| NEXT_PUBLIC_APP_URL | http://localhost:3000 | URL приложения |
| OLLAMA_URL | http://ai:11434 | URL AI сервиса |
| AI_MODEL | mistral:7b | Модель AI |

## 🐛 Отладка

```bash
# Проверить статус контейнеров
docker ps

# Проверить логи конкретного сервиса
docker-compose logs app
docker-compose logs db
docker-compose logs ai

# Health check
curl http://localhost:3000/api/health
curl http://localhost:11434/api/tags
```
