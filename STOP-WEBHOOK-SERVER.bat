@echo off
title Stop TrustedNutra Webhook Server
color 0C

echo ========================================
echo   Stopping TrustedNutra Services
echo ========================================
echo.

REM Kill all Node.js processes (webhook server)
echo Stopping Webhook Server...
taskkill /F /IM node.exe >nul 2>&1

REM Kill all ngrok processes
echo Stopping Ngrok tunnel...
taskkill /F /IM ngrok.exe >nul 2>&1

echo.
echo ========================================
echo   All services stopped!
echo ========================================
echo.

timeout /t 3
exit
