@echo off
REM 🚀 QUICK DEPLOYMENT SCRIPT FOR COSTPLUS100 CATERING STORE (Windows)
REM This script helps you deploy your e-commerce app to production

echo ╔════════════════════════════════════════════════════════╗
echo ║  🚀 Costplus100 Catering - Deployment Helper          ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check Node.js
echo [1/5] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
node --version
echo ✅ Node.js detected
echo.

REM Step 2: Install dependencies
echo [2/5] Installing dependencies...
if exist "pnpm-lock.yaml" (
    echo Using pnpm...
    call pnpm install
) else if exist "package-lock.json" (
    echo Using npm...
    call npm install
) else (
    echo Using npm...
    call npm install
)
echo ✅ Dependencies installed
echo.

REM Step 3: Build the app
echo [3/5] Building production app...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed!
    echo Please check the errors above and fix them.
    pause
    exit /b 1
)
echo ✅ Build successful!
echo.

REM Step 4: Test the build
echo [4/5] Testing production build...
echo The preview server will start on http://localhost:4173
echo Press any key when you're done testing...
start /B npm run preview
timeout /t 3 >nul
pause >nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" >nul 2>&1
echo.

REM Step 5: Choose deployment method
echo [5/5] Choose your deployment method:
echo.
echo 1) Vercel (Recommended - FREE, easiest)
echo 2) Netlify (FREE, also great)
echo 3) Manual (I'll deploy files myself)
echo 4) Exit (I'll deploy later)
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto netlify
if "%choice%"=="3" goto manual
if "%choice%"=="4" goto exit_script
goto invalid_choice

:vercel
echo.
echo 🚀 Deploying to Vercel...
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Vercel CLI...
    call npm install -g vercel
)

echo Logging in to Vercel...
call vercel login

echo.
echo Deploying to production...
call vercel --prod

echo.
echo ✅ Deployment complete!
echo Your site is now live! Check the URL above.
goto end

:netlify
echo.
echo 🚀 Deploying to Netlify...
echo.

REM Check if Netlify CLI is installed
where netlify >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Netlify CLI...
    call npm install -g netlify-cli
)

echo Logging in to Netlify...
call netlify login

echo.
echo Deploying to production...
call netlify deploy --prod

echo.
echo ✅ Deployment complete!
echo Your site is now live! Check the URL above.
goto end

:manual
echo.
echo 📦 Manual Deployment Instructions:
echo.
echo Your production files are in the 'dist' folder.
echo.
echo ✅ What to upload:
echo   • Upload everything inside the 'dist' folder
echo   • Upload to your web host's public folder (public_html, www, etc.)
echo.
echo ❌ What NOT to upload:
echo   • Don't upload node_modules
echo   • Don't upload src
echo   • Don't upload package.json
echo.
echo 📋 Files ready in: %cd%\dist
echo.
echo 🔧 Don't forget to configure your web server for SPA routing!
echo See DEPLOYMENT_GUIDE.md for Apache/.htaccess or Nginx config.
goto end

:exit_script
echo.
echo No problem! Your production build is ready in the 'dist' folder.
echo Deploy whenever you're ready using the instructions in DEPLOYMENT_GUIDE.md
goto end

:invalid_choice
echo ❌ Invalid choice. Exiting.
pause
exit /b 1

:end
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  🎉 Deployment Process Complete!                      ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 📚 For more information, see DEPLOYMENT_GUIDE.md
echo.
echo ✅ Backend API: Already deployed on Supabase
echo ✅ Database: Already deployed on Supabase
echo ✅ Frontend: Just deployed!
echo.
echo 🧪 Test your live site:
echo   - Homepage
echo   - Product listings
echo   - Shopping cart
echo   - Checkout process
echo   - Admin panel
echo.
echo 🔐 Security checklist:
echo   - [ ] HTTPS enabled (SSL certificate)
echo   - [ ] Admin panel secured
echo   - [ ] Payment gateway tested
echo   - [ ] Email notifications working
echo.
echo Happy selling! 🛒💰
echo.
pause
