if (-not $env:BASE_URL) {
  $env:BASE_URL = "http://127.0.0.1:3000"
}

Write-Host "AI load test is intentionally conservative. Provide SESSION_COOKIE for authenticated AI checks."
.\k6.exe run .\tests\load\ai.load.js
