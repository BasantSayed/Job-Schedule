@echo off
REM Double-click this file to start the API server and Cloudflare tunnel.

echo Starting API server and Cloudflare Tunnel...

start "API Server" powershell -NoExit -Command "cd 'C:\Users\RTX\Desktop\Distributed'; npm run dev --workspace @scheduler/api"

timeout /t 2 /nobreak >nul

start "Cloudflare Tunnel" powershell -NoExit -Command "cloudflared tunnel --url http://localhost:8080"

echo.
echo Both windows are starting.
echo Copy the trycloudflare.com URL from the Tunnel window and update your GitHub secret VITE_API_BASE_URL.
echo.
pause
