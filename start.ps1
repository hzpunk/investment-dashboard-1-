param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "prod",

    [switch]$NoBuild,
    [switch]$NoAiModel
)

$ErrorActionPreference = "Continue"

Write-Host "Investment Dashboard Docker Starter"
Write-Host "==================================="

function Test-CommandExists {
    param([string]$Command)

    $cmd = Get-Command $Command -ErrorAction SilentlyContinue
    return $null -ne $cmd
}

function Get-ContainerHealth {
    param([string]$ContainerName)

    $exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

    if (-not $exists) {
        return "not found"
    }

    $health = docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $ContainerName 2>$null

    if ([string]::IsNullOrWhiteSpace($health)) {
        return "unknown"
    }

    return $health
}

if (-not (Test-CommandExists "docker")) {
    Write-Host "ERROR: Docker CLI not found. Install Docker Desktop and restart PowerShell." -ForegroundColor Red
    exit 1
}

docker ps *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

try {
    docker compose version *> $null
}
catch {
    Write-Host "ERROR: 'docker compose' is not available. Update Docker Desktop." -ForegroundColor Red
    exit 1
}

if ($Mode -eq "dev") {
    Write-Host "Development mode"
    $ComposeFile = "docker-compose.dev.yml"
    $DbContainer = "investment-db-dev"
    $AiContainer = "investment-ai-dev"
    $AppContainer = $null
}
else {
    Write-Host "Production mode"
    $ComposeFile = "docker-compose.yml"
    $DbContainer = "investment-db"
    $AiContainer = "investment-ai"
    $AppContainer = "investment-app"
}

if (-not (Test-Path $ComposeFile)) {
    Write-Host "ERROR: File $ComposeFile not found. Run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "Starting services..."

docker compose -f $ComposeFile down --remove-orphans 2>$null

if ($NoBuild) {
    docker compose -f $ComposeFile up -d
}
else {
    docker compose -f $ComposeFile build
    docker compose -f $ComposeFile up -d
}

Write-Host "Waiting for services..."
Start-Sleep -Seconds 8

$DbHealth = Get-ContainerHealth $DbContainer
$AiHealth = Get-ContainerHealth $AiContainer

Write-Host ""
Write-Host "Service status:"
Write-Host "  Database: $DbHealth"
Write-Host "  AI:       $AiHealth"

if ($AppContainer) {
    $AppHealth = Get-ContainerHealth $AppContainer
    Write-Host "  App:      $AppHealth"
}

if (-not $NoAiModel) {
    Write-Host ""
    Write-Host "Checking AI model..."

    $ollamaList = docker exec $AiContainer ollama list 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Could not check Ollama. The container may still be starting." -ForegroundColor Yellow
    }
    elseif ($ollamaList -notmatch "mistral") {
        Write-Host "Downloading Mistral 7B model. This may take a while..."
        docker exec $AiContainer ollama pull mistral:7b
        Write-Host "AI model ready!"
    }
    else {
        Write-Host "AI model already exists"
    }
}

Write-Host ""
Write-Host "Services started!"
Write-Host ""
Write-Host "URLs:"
Write-Host "  App:      http://localhost:3000"
Write-Host "  Database: localhost:5432"
Write-Host "  AI:       http://localhost:11434"
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "In dev mode Docker starts only DB and AI."
    Write-Host "Run the app separately:"
    Write-Host "  pnpm install"
    Write-Host "  pnpm prisma generate"
    Write-Host "  pnpm prisma db push"
    Write-Host "  pnpm dev"
    Write-Host ""
}

Write-Host "Commands:"
Write-Host "  View logs: docker compose -f $ComposeFile logs -f"
Write-Host "  Stop:      docker compose -f $ComposeFile down"
Write-Host "  Restart:  .\start.ps1 $Mode"
Write-Host ""
