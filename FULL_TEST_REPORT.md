# Полный тестовый отчёт - InvestTrack

**Дата:** 24 апреля 2026  
**Версия:** Дипломная сборка

---

## 1. Инфраструктура

### Docker Services
- [ ] PostgreSQL запущен (порт 5432)
- [ ] Ollama AI запущен (порт 11434)
- [ ] Next.js приложение (порт 3000)
- [ ] Health checks работают

### Переменные окружения
- [ ] DATABASE_URL настроен
- [ ] OLLAMA_URL настроен
- [ ] SESSION_SECRET установлен

---

## 2. Аутентификация

### Регистрация
- [ ] Форма отображается
- [ ] Валидация email
- [ ] Валидация пароля (мин 6 символов)
- [ ] Чекбоксы юридических документов
- [ ] Без согласия кнопка disabled
- [ ] Успешная регистрация
- [ ] Создание сессии

### Логин
- [ ] Форма отображается
- [ ] Проверка credentials
- [ ] Успешный вход
- [ ] Cookie установлена

### Сессия
- [ ] Проверка /api/auth/me
- [ ] Автоматический logout при истечении
- [ ] Защищённые маршруты

---

## 3. API Endpoints

### Auth (5 endpoints)
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] POST /api/auth/logout
- [ ] GET /api/auth/me
- [ ] POST /api/auth/password

### Data (9 endpoints)
- [ ] GET /api/data/accounts
- [ ] GET /api/data/assets
- [ ] GET /api/data/goals
- [ ] GET /api/data/portfolios
- [ ] GET /api/data/portfolios/[id]/stats
- [ ] GET /api/data/profiles
- [ ] GET /api/data/transactions
- [ ] GET /api/data/transactions/recent
- [ ] POST /api/data/bootstrap

### Diploma Features (10 endpoints)
- [ ] GET /api/analytics
- [ ] GET /api/export
- [ ] POST /api/import
- [ ] GET /api/dividends
- [ ] GET /api/notifications
- [ ] GET /api/portfolio/rebalance
- [ ] POST /api/ai/chat
- [ ] GET /api/health
- [ ] GET /api/market-data
- [ ] GET /api/cron/update-prices

---

## 4. Frontend Pages

### Public
- [ ] /login
- [ ] /register
- [ ] /legal (обзор документов)
- [ ] /legal/privacy
- [ ] /legal/terms
- [ ] /legal/risks
- [ ] /legal/cookies
- [ ] /legal/consent

### Dashboard (Protected)
- [ ] /dashboard (главная)
- [ ] /accounts (счета)
- [ ] /assets (активы)
- [ ] /assets/[id] (детали актива)
- [ ] /portfolios (портфели)
- [ ] /portfolios/[id] (детали портфеля)
- [ ] /transactions (транзакции)
- [ ] /goals (цели)
- [ ] /goals/[id] (детали цели)
- [ ] /settings (настройки)
- [ ] /analytics (аналитика)
- [ ] /admin/* (админ панель)

---

## 5. Бизнес-логика

### Учёт активов
- [ ] Создание актива
- [ ] Редактирование актива
- [ ] Удаление актива
- [ ] Привязка к портфелю

### Транзакции
- [ ] Создание покупки
- [ ] Создание продажи
- [ ] Создание дивиденда
- [ ] Расчёт общей стоимости
- [ ] Расчёт прибыли/убытка

### Портфели
- [ ] Создание портфеля
- [ ] Добавление активов
- [ ] Удаление активов
- [ ] Расчёт стоимости
- [ ] Распределение по типам

### Цели
- [ ] Создание цели
- [ ] Отслеживание прогресса
- [ ] Процент выполнения

---

## 6. Дипломные функции

### Аналитика
- [ ] Доходность портфеля
- [ ] CAGR расчёт
- [ ] Распределение активов
- [ ] Графики

### Экспорт
- [ ] CSV формат
- [ ] JSON формат
- [ ] Типы: transactions, portfolio, tax-report

### Импорт
- [ ] CSV загрузка
- [ ] JSON загрузка
- [ ] Валидация данных

### Дивиденды
- [ ] Запись дивиденда
- [ ] История выплат
- [ ] Фильтр по году

### Ребалансировка
- [ ] Расчёт ребалансировки
- [ ] Рекомендации

### AI Консультант
- [ ] Чат интерфейс
- [ ] Ответы на вопросы
- [ ] Контекст портфеля
- [ ] Graceful degradation

---

## 7. Безопасность

- [ ] Пароли хешируются bcrypt
- [ ] httpOnly cookies
- [ ] SameSite=Lax
- [ ] withAuth wrapper
- [ ] CSRF защита
- [ ] SQL injection защита (Prisma)
- [ ] XSS защита

---

## 8. Юридическое соответствие

- [ ] Политика конфиденциальности
- [ ] Пользовательское соглашение
- [ ] Уведомление о рисках
- [ ] Политика cookies
- [ ] Согласие на обработку ПДн
- [ ] Интеграция в регистрацию

---

## Итоги

### Успешно: _/_
### Ошибки: _
### Критичные: _
### Рекомендации: _

**Статус:** [ ] Готов к сдаче  [ ] Требуется доработка
