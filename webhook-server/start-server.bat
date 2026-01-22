@echo off
echo.
echo ========================================
echo   TrustedNutra Webhook Server
echo ========================================
echo.

REM Check if node_modules exists
IF NOT EXIST "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if database exists
IF NOT EXIST "trustednutra.db" (
    echo.
    echo ========================================
    echo   First Time Setup Detected
    echo ========================================
    echo.
    echo Would you like to import your CSV files now?
    echo (Files should be in: ..\Sales Record\)
    echo.
    set /p IMPORT="Import CSV files? (Y/N): "

    IF /I "%IMPORT%"=="Y" (
        echo.
        echo Importing CSV files...
        node csv-importer.js "..\Sales Record"
        echo.
        echo Press any key to start the server...
        pause > nul
    )
)

echo.
echo Starting webhook server...
echo Server will run on: http://localhost:3000
echo.
echo ========================================
echo   IMPORTANT: Keep this window open!
echo ========================================
echo.
echo Webhook URLs to configure in Buygoods:
echo   New Order:    http://YOUR_SERVER:3000/webhook/new-order
echo   Refund:       http://YOUR_SERVER:3000/webhook/refund
echo   Cancel:       http://YOUR_SERVER:3000/webhook/cancel
echo   Chargeback:   http://YOUR_SERVER:3000/webhook/chargeback
echo   Fulfilled:    http://YOUR_SERVER:3000/webhook/fulfilled
echo   Recurring:    http://YOUR_SERVER:3000/webhook/recurring
echo.
echo ========================================
echo.

call npm start
