@echo off
title TrustedNutra Webhook Server
color 0A

echo ========================================
echo   TrustedNutra Webhook Server Starter
echo ========================================
echo.
echo Starting Ngrok tunnel...
echo.

REM Start ngrok in a new window (navigate to ngrok directory first)
start "Ngrok Tunnel" cmd /k "cd /d C:\ngrok-v3-stable-windows-amd64 && ngrok http 3000"

REM Wait 3 seconds for ngrok to start
timeout /t 3 /nobreak > nul

echo.
echo Ngrok started in separate window!
echo.
echo Starting Webhook Server...
echo.

REM Navigate to webhook-server directory and start the server
cd /d "%~dp0webhook-server"
npm start

REM If server stops, keep window open to see any errors
pause
