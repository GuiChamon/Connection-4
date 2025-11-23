@echo off
REM run_servers.bat - chama o PowerShell script para abrir os dois terminais
powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\run_servers.ps1"
pause
