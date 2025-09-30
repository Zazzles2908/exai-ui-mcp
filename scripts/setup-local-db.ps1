# Setup Local PostgreSQL Database for EXAI UI
# This script sets up a local PostgreSQL database using Docker

Write-Host "🚀 Setting up local PostgreSQL database for EXAI UI..." -ForegroundColor Cyan

# Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is installed and running" -ForegroundColor Green

# Configuration
$CONTAINER_NAME = "exai-ui-postgres"
$POSTGRES_USER = "postgres"
$POSTGRES_PASSWORD = "exai_dev_password"
$POSTGRES_DB = "exai_ui"
$POSTGRES_PORT = "5432"

# Check if container already exists
$existingContainer = docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}"

if ($existingContainer -eq $CONTAINER_NAME) {
    Write-Host "⚠️  Container '$CONTAINER_NAME' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to remove it and create a new one? (y/N)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "🗑️  Removing existing container..." -ForegroundColor Yellow
        docker stop $CONTAINER_NAME 2>$null
        docker rm $CONTAINER_NAME 2>$null
        Write-Host "✅ Container removed" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Starting existing container..." -ForegroundColor Cyan
        docker start $CONTAINER_NAME
        Write-Host "✅ Container started" -ForegroundColor Green
        exit 0
    }
}

# Create and start PostgreSQL container
Write-Host "📦 Creating PostgreSQL container..." -ForegroundColor Cyan

docker run -d `
    --name $CONTAINER_NAME `
    -e POSTGRES_USER=$POSTGRES_USER `
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD `
    -e POSTGRES_DB=$POSTGRES_DB `
    -p "${POSTGRES_PORT}:5432" `
    -v exai-ui-postgres-data:/var/lib/postgresql/data `
    postgres:16-alpine

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create PostgreSQL container" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PostgreSQL container created and started" -ForegroundColor Green

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    $attempt++
    try {
        docker exec $CONTAINER_NAME pg_isready -U $POSTGRES_USER | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        } else {
            Start-Sleep -Seconds 1
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host "❌ PostgreSQL failed to start within 30 seconds" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green

# Create .env file if it doesn't exist
$envPath = Join-Path $PSScriptRoot "..\app\.env"
$envExamplePath = Join-Path $PSScriptRoot "..\app\.env.example"

if (-not (Test-Path $envPath)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Cyan
    
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
    } else {
        # Create basic .env file
        @"
# Adapter Configuration
ADAPTER_MODE=local

# Database Configuration
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

# EXAI Daemon Configuration
EXAI_DAEMON_URL=http://127.0.0.1:8765
EXAI_TIMEOUT=300000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(New-Guid)

# Application Configuration
NODE_ENV=development
"@ | Out-File -FilePath $envPath -Encoding UTF8
    }
    
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .env file already exists" -ForegroundColor Yellow
}

# Run Prisma migrations
Write-Host "🔄 Running Prisma migrations..." -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "..\app")

try {
    npx prisma generate
    npx prisma migrate dev --name init
    Write-Host "✅ Prisma migrations completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Prisma migration failed. You may need to run it manually:" -ForegroundColor Yellow
    Write-Host "   cd app" -ForegroundColor Yellow
    Write-Host "   npx prisma generate" -ForegroundColor Yellow
    Write-Host "   npx prisma migrate dev --name init" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Database Information:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: $POSTGRES_PORT" -ForegroundColor White
Write-Host "   Database: $POSTGRES_DB" -ForegroundColor White
Write-Host "   User: $POSTGRES_USER" -ForegroundColor White
Write-Host "   Password: $POSTGRES_PASSWORD" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Useful Commands:" -ForegroundColor Cyan
Write-Host "   Start container:  docker start $CONTAINER_NAME" -ForegroundColor White
Write-Host "   Stop container:   docker stop $CONTAINER_NAME" -ForegroundColor White
Write-Host "   View logs:        docker logs $CONTAINER_NAME" -ForegroundColor White
Write-Host "   Prisma Studio:    cd app && npx prisma studio" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure EXAI daemon is running on http://127.0.0.1:8765" -ForegroundColor White
Write-Host "   2. cd app" -ForegroundColor White
Write-Host "   3. npm run dev" -ForegroundColor White
Write-Host ""

