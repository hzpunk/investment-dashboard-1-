#!/bin/bash
# Validate the LM Studio OpenAI-compatible chat endpoint used by the backend.

set -e

echo "🤖 Checking AI Assistant endpoint..."

OLLAMA_URL=${OLLAMA_URL:-"http://100.91.135.114:11434/v1"}
MODEL=${AI_MODEL:-"mistralai/mistral-7b-instruct-v0.3"}
CHAT_URL="${OLLAMA_URL%/}/chat/completions"

RESPONSE=$(curl -sS --max-time 120 "$CHAT_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"$MODEL\",
      \"messages\": [
        {\"role\": \"user\", \"content\": \"Say hello\"}
      ],
      \"stream\": false
    }")

if echo "$RESPONSE" | grep -q '"choices"'; then
    echo "✅ LM Studio endpoint is reachable and returned a chat completion."
else
    echo "❌ LM Studio endpoint did not return an OpenAI-compatible response."
    exit 1
fi
