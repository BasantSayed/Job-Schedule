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

function Invoke-PagesDeploy {
  # Suppress stdout so only the clean run id is returned by this function.
  gh workflow run pages.yml *> $null
  if ($LASTEXITCODE -ne 0) { return $null }
  Start-Sleep -Seconds 10
  $json = (gh run list --workflow=pages.yml --limit 1 --json databaseId 2>$null | Out-String)
  try {
    $arr = $json | ConvertFrom-Json
    if ($arr -and $arr.Count -ge 1) { return ("" + $arr[0].databaseId).Trim() }
  } catch {}
  return $null
}

function Wait-RunResult([string]$runId) {
  # Poll until the run completes (build+deploy usually takes 5-11 minutes).
  # Parse JSON in PowerShell to avoid cross-shell --jq quoting issues.
  $deadline = (Get-Date).AddMinutes(20)
  while ((Get-Date) -lt $deadline) {
    $json = (gh run view $runId --json status,conclusion 2>$null | Out-String)
    if ($json.Trim()) {
      try {
        $obj = $json | ConvertFrom-Json
        if ($obj.status -eq "completed") {
          if ($obj.conclusion) { return $obj.conclusion } else { return "unknown" }
        }
      } catch {}
    }
    Start-Sleep -Seconds 20
  }
  return "timeout"
}

Write-Host "Triggering Pages deployment (takes 5-11 minutes)..."
$maxAttempts = 3
$deployOk = $false

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
  $runId = Invoke-PagesDeploy
  if (-not $runId) {
    Write-Host "Attempt ${attempt}: could not trigger workflow." -ForegroundColor Yellow
    continue
  }
  Write-Host "Attempt ${attempt}: waiting for run $runId to finish..."
  $result = Wait-RunResult $runId
  if ($result -eq "success") {
    $deployOk = $true
    break
  }
  Write-Host "Attempt ${attempt} ended with: $result. Retrying..." -ForegroundColor Yellow
}

if (-not $deployOk) {
  Write-Host "Deployment did not succeed after $maxAttempts attempts." -ForegroundColor Red
  Write-Host "Open GitHub Actions and re-run pages.yml manually." -ForegroundColor Yellow
  exit 1
}

Write-Host "`nAll done." -ForegroundColor Green
Write-Host "1) API server started in separate window"
Write-Host "2) Tunnel URL captured: $tunnelUrl"
Write-Host "3) GitHub secret updated automatically"
Write-Host "4) Site deployed successfully: https://basantsayed.github.io/Job-Schedule/"
