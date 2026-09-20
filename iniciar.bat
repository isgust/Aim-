@echo off
title Aime Bot - Discord
cd /d "%~dp0"
chcp 65001 >nul
cls
echo Iniciando Aime Bot em segundo plano...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-segundo-plano.ps1"
echo.
echo [OK] Bot Aime ativo!
echo Para parar o bot, execute parar.bat.
pause
