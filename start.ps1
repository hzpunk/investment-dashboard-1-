param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "prod",

    [switch]$NoBuild
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
    $AppContainer = $null
}
else {
    Write-Host "Production mode"
    $ComposeFile = "docker-compose.yml"
    $DbContainer = "investment-db"
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

Write-Host ""
Write-Host "Service status:"
Write-Host "  Database: $DbHealth"

if ($AppContainer) {
    $AppHealth = Get-ContainerHealth $AppContainer
    Write-Host "  App:      $AppHealth"
}

Write-Host ""
Write-Host "Services started!"
Write-Host ""
Write-Host "URLs:"
Write-Host "  App:      http://localhost:3000"
Write-Host "  Database: localhost:5432"
Write-Host ""

if ($Mode -eq "dev") {
    Write-Host "In dev mode Docker starts DB and Redis. LM Studio runs on the Tailscale-connected Windows machine."
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
