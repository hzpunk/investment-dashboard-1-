if (-not $env:BASE_URL) {
  $env:BASE_URL = "http://127.0.0.1:3000"
}

.\k6.exe run .\tests\load\api.load.js
