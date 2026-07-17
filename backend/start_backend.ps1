Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$backendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $backendRoot 'venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    throw "Backend virtual environment was not found at $python"
}

Set-Location -LiteralPath $backendRoot
& $python -m uvicorn main:app --host 0.0.0.0 --port 8000
