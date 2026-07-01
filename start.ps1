Write-Host "Starting API server and Cloudflare Tunnel..." -ForegroundColor Cyan

# Window 1: API server
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd 'C:\Users\RTX\Desktop\Distributed'; Write-Host 'API Server' -ForegroundColor Green; npm run dev --workspace @scheduler/api"
)

Start-Sleep -Seconds 2

# Window 2: Cloudflare Tunnel
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'Cloudflare Tunnel' -ForegroundColor Yellow; cloudflared tunnel --url http://localhost:8080"
)

Write-Host ""
Write-Host "Both windows are starting." -ForegroundColor Green
Write-Host "Copy the trycloudflare.com URL from the Tunnel window and update your GitHub secret VITE_API_BASE_URL." -ForegroundColor Yellow
