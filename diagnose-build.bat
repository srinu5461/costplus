@echo off
REM 🔍 Build Diagnostic Script for Windows
REM This helps identify why the dist folder isn't being created

echo ╔════════════════════════════════════════════════════════╗
echo ║  🔍 Build Diagnostic Tool                             ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check Node.js
echo [1/6] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)
node --version
echo ✅ Node.js found
echo.

REM Step 2: Check if package.json exists
echo [2/6] Checking package.json...
if exist "package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found!
    echo Are you in the correct directory?
    pause
    exit /b 1
)
echo.

REM Step 3: Check if node_modules exists
echo [3/6] Checking dependencies...
if exist "node_modules\" (
    echo ✅ node_modules folder exists
) else (
    echo ⚠️  node_modules not found
    echo Running npm install...
    call npm install
)
echo.

REM Step 4: Clean old build
echo [4/6] Cleaning old build...
if exist "dist\" (
    echo ⚠️  Old dist folder found - removing...
    rmdir /s /q dist
    echo ✅ Cleaned
) else (
    echo ✅ No old dist folder
)
echo.

REM Step 5: Attempt build
echo [5/6] Building application...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call npm run build 2>&1 | tee build.log
set BUILD_EXIT_CODE=%errorlevel%

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Step 6: Check results
echo [6/6] Checking results...
echo.

if %BUILD_EXIT_CODE% equ 0 (
    echo ✅ Build command completed without errors
    echo.
    
    if exist "dist\" (
        echo 🎉 SUCCESS! dist folder created!
        echo.
        echo 📂 Contents of dist folder:
        dir dist\
        echo.
        echo ✅ Ready to deploy!
        echo.
        echo Your files are in: %cd%\dist
    ) else (
        echo ❌ Build succeeded but dist folder not found!
        echo.
        echo This is unusual. Check vite.config.ts for custom outDir
    )
) else (
    echo ❌ Build FAILED with errors!
    echo.
    echo Common issues:
    echo.
    echo 1. Missing dependencies:
    echo    Solution: npm install
    echo.
    echo 2. TypeScript errors:
    echo    Check the errors above
    echo.
    echo 3. Import errors:
    echo    Check file paths and imports
    echo.
    echo 📋 Build log saved to: build.log
    echo    Review it with: type build.log
    echo.
    echo 🔧 Try fixing the errors above and run this script again
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Diagnostic Complete                                   ║
echo ╚════════════════════════════════════════════════════════╝
echo.
pause
