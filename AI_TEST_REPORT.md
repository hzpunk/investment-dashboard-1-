# AI Тестовый отчёт - InvestTrack

**Компонент:** AI-консультант через LM Studio OpenAI-compatible API

## Инфраструктура

- Backend вызывает `OLLAMA_URL + /chat/completions`.
- Ожидаемые значения окружения:
  - `OLLAMA_URL=http://100.91.135.114:11434/v1`
  - `AI_MODEL="Mistral 7B Instruct v0.3"`
- Frontend отправляет сообщения только во внутренний route `/api/ai/chat`.
- Tailscale IP не используется в браузерном коде.

## Backend Route

- `POST /api/ai/chat`
- Request:

```json
{
  "message": "Что у меня с портфелем?"
}
```

- Response:

```json
{
  "message": "Краткий ответ ассистента",
  "contextStatus": {
    "portfolio": "available",
    "accounts": "available",
    "marketData": "partial"
  }
}
```

## Проверка LM Studio

```bash
./scripts/init-ai.sh
```

Скрипт отправляет тестовый OpenAI-compatible chat completion request и проверяет наличие `choices` в ответе.

## Проверка Chat Route

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -b "session_token=..." \
  -d '{"message":"Сколько сейчас на моём счету?"}'
```

## Ожидаемое Поведение

- Для вопросов о портфеле используются Prisma-данные пользователя.
- Для BTC и криптоактивов используются существующие market-data cache/provider сервисы.
- Если цена отсутствует или устарела, ассистент сообщает об этом и не выдумывает котировку.
- При недоступности LM Studio route возвращает дружелюбную ошибку без внутренних деталей.
