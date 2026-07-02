@echo off
REM ============================================================
REM  Double-click this every time you start your PC.
REM  Run setup-tunnel.bat FIRST if you haven't done so yet.
REM ============================================================

echo Starting API server and Cloudflare Tunnel...

REM Window 1: API server
start "API Server" powershell -NoExit -ExecutionPolicy Bypass -Command "cd 'C:\Users\RTX\Desktop\Distributed'; Write-Host 'API Server starting...' -ForegroundColor Green; npm run dev --workspace @scheduler/api"

timeout /t 2 /nobreak >nul

REM Window 2: Named tunnel (permanent URL - never changes)
start "Cloudflare Tunnel" powershell -NoExit -ExecutionPolicy Bypass -Command "Write-Host 'Starting permanent Cloudflare tunnel...' -ForegroundColor Yellow; cloudflared tunnel run task-manager-api"

echo.
echo Both windows are starting.
echo Your API URL is permanent - no need to update GitHub secrets.
echo.
