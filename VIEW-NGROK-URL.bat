@echo off
title Ngrok URL Viewer
color 0B

echo ========================================
echo   Getting your Ngrok Public URL...
echo ========================================
echo.

REM Check if ngrok is running
tasklist /FI "IMAGENAME eq ngrok.exe" 2>NUL | find /I /N "ngrok.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo ERROR: Ngrok is not running!
    echo.
    echo Please start the webhook server first using:
    echo START-WEBHOOK-SERVER.bat
    echo.
    pause
    exit
)

echo Fetching URL from ngrok API...
echo.

REM Fetch ngrok URL from API
curl -s http://localhost:4040/api/tunnels | findstr "public_url"

echo.
echo.
echo ========================================
echo   Use this URL in Buygoods webhooks
echo ========================================
echo.
echo Add /webhook/new-order, /webhook/refund, etc.
echo.

pause
