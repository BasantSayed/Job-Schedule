$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Join-Path $repoRoot ".runtime"
$logOutFile = Join-Path $runtimeDir "cloudflared.out.log"
$logErrFile = Join-Path $runtimeDir "cloudflared.err.log"
$urlFile = Join-Path $runtimeDir "current-tunnel-url.txt"

function Write-Step([string]$message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Ensure-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $name"
  }
}

Set-Location $repoRoot
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

# Ensure common tool locations are on PATH (fresh shells may miss them)
$extraPaths = @(
  "C:\Program Files\GitHub CLI",
  "C:\Program Files\Git\cmd",
  "C:\Program Files\nodejs"
)
foreach ($p in $extraPaths) {
  if ((Test-Path $p) -and ($env:PATH -notlike "*$p*")) {
    $env:PATH += ";$p"
  }
}

Write-Step "Starting API server window"
$apiCommand = "Set-Location '$repoRoot'; npm run dev --workspace @scheduler/api"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", $apiCommand
) | Out-Null

Start-Sleep -Seconds 2

Write-Step "Starting Cloudflare quick tunnel"
Ensure-Command "cloudflared"
Remove-Item $logOutFile -ErrorAction SilentlyContinue
Remove-Item $logErrFile -ErrorAction SilentlyContinue

# Stop old quick tunnels so we always pick the fresh URL.
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "cloudflared.exe" -and
    $_.CommandLine -match "tunnel --url http://localhost:8080"
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

$cloudflaredProc = Start-Process cloudflared -ArgumentList @(
  "tunnel", "--url", "http://localhost:8080", "--no-autoupdate"
) -RedirectStandardOutput $logOutFile -RedirectStandardError $logErrFile -PassThru

Write-Host "Cloudflared PID: $($cloudflaredProc.Id)"

Write-Step "Waiting for tunnel URL"
$deadline = (Get-Date).AddSeconds(60)
$urlPattern = "https://[a-z0-9-]+\.trycloudflare\.com"
$tunnelUrl = $null

while ((Get-Date) -lt $deadline) {
  $outContent = if (Test-Path $logOutFile) { Get-Content -Path $logOutFile -Raw -ErrorAction SilentlyContinue } else { "" }
  $errContent = if (Test-Path $logErrFile) { Get-Content -Path $logErrFile -Raw -ErrorAction SilentlyContinue } else { "" }
  $combined = "$outContent`n$errContent"
  if ($combined) {
    $match = [regex]::Match($combined, $urlPattern)
    if ($match.Success) {
      $tunnelUrl = $match.Value
      break
    }
  }
  Start-Sleep -Milliseconds 500
}

if (-not $tunnelUrl) {
  Write-Host "Could not detect trycloudflare URL in 60s." -ForegroundColor Red
  Write-Host "Check logs: $logOutFile and $logErrFile" -ForegroundColor Yellow
  exit 1
}

Set-Content -Path $urlFile -Value $tunnelUrl
Write-Host "Tunnel URL: $tunnelUrl" -ForegroundColor Green

Write-Step "Updating GitHub secret and triggering Pages deploy"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI (gh) not found. Skipping auto-update." -ForegroundColor Yellow
  Write-Host "Manual action needed: set VITE_API_BASE_URL to $tunnelUrl" -ForegroundColor Yellow
  exit 0
}

$status = gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "gh is not authenticated. Run: gh auth login" -ForegroundColor Yellow
  Write-Host "Manual action needed: set VITE_API_BASE_URL to $tunnelUrl" -ForegroundColor Yellow
  exit 0
}

gh secret set VITE_API_BASE_URL --body $tunnelUrl
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to update GitHub secret automatically." -ForegroundColor Yellow
  Write-Host "Manual action needed: set VITE_API_BASE_URL to $tunnelUrl" -ForegroundColor Yellow
  exit 0
}

gh workflow run pages.yml
if ($LASTEXITCODE -ne 0) {
  Write-Host "Secret updated but workflow trigger failed. Re-run pages.yml manually in GitHub Actions." -ForegroundColor Yellow
  exit 0
}

Write-Host "`nAll done." -ForegroundColor Green
Write-Host "1) API server started in separate window"
Write-Host "2) Tunnel URL captured: $tunnelUrl"
Write-Host "3) GitHub secret updated automatically"
Write-Host "4) Pages workflow triggered automatically"
