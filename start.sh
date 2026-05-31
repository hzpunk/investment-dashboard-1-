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
    DB_CONTAINER="investment-db-dev"
    APP_CONTAINER=""
else
    echo "🏭 Production mode"
    COMPOSE_FILE="docker-compose.yml"
    DB_CONTAINER="investment-db"
    APP_CONTAINER="investment-app"
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
DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null || echo "unknown")

echo ""
echo "📊 Service Status:"
echo "  Database: $DB_HEALTH"

if [ "$MODE" == "prod" ]; then
    APP_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$APP_CONTAINER" 2>/dev/null || echo "unknown")
    echo "  App: $APP_HEALTH"
fi

echo ""
echo "✅ Services started!"
echo ""
echo "🔗 URLs:"
echo "  App:      http://localhost:3000"
echo "  Database: localhost:5432"
echo ""

echo ""
echo "📝 Commands:"
echo "  View logs:     docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop:          docker-compose -f $COMPOSE_FILE down"
echo "  Restart:       ./start.sh $MODE"
echo ""
