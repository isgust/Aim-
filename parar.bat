@echo off
title Parar Sao Raimundo Bot
cd /d "%~dp0"
echo Parando o processo do bot...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*bot.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Bot encerrado com sucesso!' }"
timeout /t 2 >nul
exit
