@echo off
REM ============================================================
REM  Double-click this every time you start your PC.
REM  The Cloudflare tunnel runs automatically as a Windows
REM  service - no need to start it manually.
REM ============================================================

echo Starting API server...

start "API Server" powershell -NoExit -ExecutionPolicy Bypass -Command "cd 'C:\Users\RTX\Desktop\Distributed'; Write-Host 'API Server starting...' -ForegroundColor Green; npm run dev --workspace @scheduler/api"

echo.
echo API server is starting in a new window.
echo The Cloudflare tunnel runs automatically in the background.
echo Your live site is ready at: https://basantsayed.github.io/Job-Schedule
echo.
