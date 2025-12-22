# Nexus Workspace Setup - Docker Edition
Write-Host "Nexus Workspace Setup - Docker Edition" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Get current directory
$currentDir = Get-Location

Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
docker run --rm -v ${currentDir}:/app -w /app --memory=1g node:24-alpine npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting the application with Docker Compose..." -ForegroundColor Yellow
docker-compose up --build

Read-Host "Press Enter to exit"
