@echo off
title Ngrok URL Viewer
color 0B

echo ========================================
echo   Getting your Ngrok Public URL...
echo ========================================
echo.

REM Fetch ngrok URL from API
curl -s http://localhost:4040/api/tunnels | findstr "public_url"

echo.
echo.
echo ========================================
echo   Use this URL in Buygoods webhooks
echo ========================================
echo.

pause
