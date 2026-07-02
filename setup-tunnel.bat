@echo off
REM ============================================================
REM  Run this ONE TIME to create your permanent Cloudflare tunnel.
REM  After this, use start.bat every day - the URL never changes.
REM ============================================================

echo ============================================================
echo  STEP 1: Logging in to Cloudflare (browser will open)
echo ============================================================
echo.
cloudflared tunnel login

echo.
echo ============================================================
echo  STEP 2: Creating permanent tunnel named "task-manager-api"
echo ============================================================
echo.
cloudflared tunnel create task-manager-api

echo.
echo ============================================================
echo  STEP 3: Creating tunnel config file
echo ============================================================

REM Write config.yml into the .cloudflared folder
if not exist "%USERPROFILE%\.cloudflared" mkdir "%USERPROFILE%\.cloudflared"

(
echo tunnel: task-manager-api
echo credentials-file: %USERPROFILE%\.cloudflared\task-manager-api.json
echo ingress:
echo   - service: http://localhost:8080
) > "%USERPROFILE%\.cloudflared\config.yml"

echo.
echo ============================================================
echo  DONE! Now do these 2 things once:
echo.
echo  1. Look above for a line like:
echo       "Your tunnel has been created with ID: xxxxxxxx-..."
echo     Your permanent API URL is:
echo       https://task-manager-api.cfargotunnel.com
echo     OR if that doesn't work, it will be:
echo       https://<the-uuid-shown-above>.cfargotunnel.com
echo.
echo  2. Go to your GitHub repo - Settings - Secrets
echo     Update VITE_API_BASE_URL to that URL (no trailing slash)
echo     Then re-run the GitHub Pages workflow once.
echo.
echo  After that, just double-click start.bat every day. Done!
echo ============================================================
echo.
pause
