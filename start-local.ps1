param([string]$PostgresBin = 'D:\Postgre\bin')
$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$python = Join-Path $project 'backend\venv\Scripts\python.exe'
$node = (Get-Command node -ErrorAction Stop).Source
$cluster = Join-Path $project '.local\postgres'
if (!(Test-Path $python) -or !(Test-Path "$project\backend\.env") -or !(Test-Path "$project\frontend\node_modules")) {
    throw 'Install dependencies and configure backend/.env first. See LOCAL.md.'
}
if (!(Test-Path $cluster)) { throw 'The project-local PostgreSQL cluster is missing. See LOCAL.md.' }
& "$PostgresBin\pg_ctl.exe" -D $cluster status *> $null
if ($LASTEXITCODE -ne 0) {
    & "$PostgresBin\pg_ctl.exe" -D $cluster -l "$project\.local\postgres.log" -o '-h 127.0.0.1 -p 5433' -w start
    if ($LASTEXITCODE -ne 0) { throw 'Could not start local PostgreSQL.' }
}
function Start-LocalService($Url, $File, $Arguments, $Directory, $Name) {
    try { $null = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 3; return } catch {}
    $process = Start-Process -FilePath $File -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput "$project\.local\$Name.log" -RedirectStandardError "$project\.local\$Name.error.log"
    $process.Id | Set-Content "$project\.local\$Name.pid"
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try { $null = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 2; return } catch {}
        if ($process.HasExited) { throw "$Name exited. Check .local/$Name.error.log." }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name did not become healthy. Check .local/$Name.error.log."
}
Start-LocalService 'http://127.0.0.1:8001/health' $python '-m uvicorn main:app --host 127.0.0.1 --port 8001' "$project\backend" 'api'
Start-LocalService 'http://127.0.0.1:5173' $node 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort' "$project\frontend" 'frontend'
Write-Host 'App: http://127.0.0.1:5173'
Write-Host 'API: http://127.0.0.1:8001/docs'
