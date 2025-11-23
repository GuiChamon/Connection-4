# scripts/run_servers.ps1
# Abre duas janelas do PowerShell e executa os comandos do frontend e backend
# Uso: Execute este script (Ex.: right-click -> Run with PowerShell) ou chame pelo .bat

param()

$projRoot = "C:\projetos\Connection-4"
$backend = Join-Path $projRoot "backend"

Write-Host "Abrindo servidor frontend em: $projRoot" -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy Bypass",
    "-Command",
    "Set-Location -LiteralPath '$projRoot'; python -m http.server 8000"
)

Start-Sleep -Milliseconds 300

Write-Host "Abrindo servidor backend em: $backend" -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy Bypass",
    "-Command",
    "Set-Location -LiteralPath '$backend'; npm run dev"
)

Write-Host "Terminais iniciados." -ForegroundColor Cyan
