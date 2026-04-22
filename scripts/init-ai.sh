#!/bin/bash
# Script to initialize AI model in Ollama

set -e

echo "🤖 Initializing AI Assistant..."

OLLAMA_URL=${OLLAMA_URL:-"http://localhost:11434"}
MODEL=${AI_MODEL:-"mistral:7b"}

echo "⏳ Waiting for Ollama to be ready..."
until curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; do
    echo "  Waiting..."
    sleep 5
done

echo "✅ Ollama is ready!"

echo "📥 Downloading model: $MODEL..."
curl -X POST "$OLLAMA_URL/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" \
    -s | while read line; do
        if echo "$line" | grep -q "completed"; then
            echo "  Progress: $(echo "$line" | grep -o '"completed":[0-9.]*' | cut -d: -f2)"
        fi
    done

echo "✅ Model $MODEL ready!"
echo "🚀 AI Assistant is ready to help with investment questions!"
