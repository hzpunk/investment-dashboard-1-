#!/bin/bash
set -e

echo "🚀 Investment Dashboard Docker Starter"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install it."
    exit 1
fi

# Parse arguments
MODE=${1:-prod}

if [ "$MODE" == "dev" ]; then
    echo "🛠️  Development mode"
    COMPOSE_FILE="docker-compose.dev.yml"
else
    echo "🏭 Production mode"
    COMPOSE_FILE="docker-compose.yml"
fi

# Build and start
echo "📦 Building and starting services..."
docker-compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
docker-compose -f $COMPOSE_FILE build --no-cache
docker-compose -f $COMPOSE_FILE up -d

# Wait for services
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check health
DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' investment-db 2>/dev/null || echo "unknown")
AI_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' investment-ai 2>/dev/null || echo "unknown")

echo ""
echo "📊 Service Status:"
echo "  Database: $DB_HEALTH"
echo "  AI: $AI_HEALTH"

if [ "$MODE" == "prod" ]; then
    APP_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' investment-app 2>/dev/null || echo "unknown")
    echo "  App: $APP_HEALTH"
fi

echo ""
echo "✅ Services started!"
echo ""
echo "🔗 URLs:"
echo "  App:      http://localhost:3000"
echo "  Database: localhost:5432"
echo "  AI:       http://localhost:11434"
echo ""

# Pull AI model if AI is running
if [ "$AI_HEALTH" == "healthy" ] || [ "$AI_HEALTH" == "unknown" ]; then
    echo "🤖 Checking AI model..."
    if ! docker exec investment-ai ollama list 2>/dev/null | grep -q "mistral"; then
        echo "📥 Downloading Mistral 7B model (this may take a few minutes)..."
        docker exec investment-ai ollama pull mistral:7b
        echo "✅ AI model ready!"
    else
        echo "✅ AI model already exists"
    fi
fi

echo ""
echo "📝 Commands:"
echo "  View logs:     docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop:          docker-compose -f $COMPOSE_FILE down"
echo "  Restart:       ./start.sh $MODE"
echo ""
