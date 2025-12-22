@echo off
echo Nexus Workspace Setup - Docker Edition
echo =====================================

echo Installing npm dependencies...
docker run --rm -v %cd%:/app -w /app --memory=1g node:24-alpine npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting the application with Docker Compose...
docker-compose up --build

pause
