@echo off
echo ========================================
echo   Excel to App - Application Starter
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "backend\package.json" (
    echo [ERROR] backend\package.json not found. Backend directory structure is incorrect.
    pause
    exit /b 1
)

echo ========================================
echo   Step 1: Installing Dependencies
echo ========================================
echo.

REM Check if frontend node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo [INFO] Frontend dependencies already installed
)
echo.

REM Check if backend node_modules exists
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [INFO] Backend dependencies already installed
)
echo.

echo ========================================
echo   Step 2: Checking Environment Files
echo ========================================
echo.

REM Check backend .env file
if not exist "backend\.env" (
    echo [WARNING] backend\.env file not found
    if exist "backend\.env.example" (
        echo [INFO] Creating backend\.env from .env.example...
        copy "backend\.env.example" "backend\.env" >nul
        echo [WARNING] Please configure backend\.env with your settings (especially PARALLEL_API_KEY)
    ) else (
        echo [ERROR] backend\.env.example not found. Cannot create .env file.
    )
) else (
    echo [INFO] Backend .env file exists
)
echo.

REM Check frontend .env file (optional)
if not exist ".env" (
    echo [INFO] Frontend .env file not found (this is optional)
) else (
    echo [INFO] Frontend .env file exists
)
echo.

echo ========================================
echo   Step 3: Starting Services
echo ========================================
echo.
echo [INFO] Starting Backend Server (Port 5000)...
echo [INFO] Starting Frontend Server (Port 3000)...
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start backend in a new window
start "Backend Server - Port 5000" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
start "Frontend Server - Port 3000" cmd /k "npm run dev"

echo.
echo ========================================
echo   Services Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Both services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause
