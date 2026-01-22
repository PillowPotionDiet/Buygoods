@echo off
echo.
echo ========================================
echo   Webhook Testing Tool
echo ========================================
echo.
echo What would you like to test?
echo.
echo 1. Send 1 test order
echo 2. Send 5 test orders
echo 3. Send 10 test orders
echo 4. Check server health
echo 5. Exit
echo.
set /p CHOICE="Enter your choice (1-5): "

IF "%CHOICE%"=="1" (
    node test-webhook.js
) ELSE IF "%CHOICE%"=="2" (
    node test-webhook.js --multiple 5
) ELSE IF "%CHOICE%"=="3" (
    node test-webhook.js --multiple 10
) ELSE IF "%CHOICE%"=="4" (
    node test-webhook.js --health
) ELSE IF "%CHOICE%"=="5" (
    exit
) ELSE (
    echo Invalid choice!
)

echo.
echo Press any key to continue...
pause > nul
