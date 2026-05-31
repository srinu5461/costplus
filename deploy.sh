#!/bin/bash

# 🚀 QUICK DEPLOYMENT SCRIPT FOR COSTPLUS100 CATERING STORE
# This script helps you deploy your e-commerce app to production

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🚀 Costplus100 Catering - Deployment Helper          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${BLUE}[1/5]${NC} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version) detected${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[2/5]${NC} Installing dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
    echo "Using pnpm..."
    pnpm install
elif [ -f "package-lock.json" ]; then
    echo "Using npm..."
    npm install
else
    echo "Using npm..."
    npm install
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Build the app
echo -e "${BLUE}[3/5]${NC} Building production app..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    echo "Please check the errors above and fix them."
    exit 1
fi
echo ""

# Step 4: Test the build
echo -e "${BLUE}[4/5]${NC} Testing production build..."
echo "The preview server will start on http://localhost:4173"
echo -e "${YELLOW}Press Ctrl+C when you're done testing${NC}"
npm run preview &
PREVIEW_PID=$!
sleep 3
echo ""

# Wait for user
read -p "Press Enter when you've tested the preview and are ready to continue..."
kill $PREVIEW_PID 2>/dev/null
echo ""

# Step 5: Choose deployment method
echo -e "${BLUE}[5/5]${NC} Choose your deployment method:"
echo ""
echo "1) Vercel (Recommended - FREE, easiest)"
echo "2) Netlify (FREE, also great)"
echo "3) Manual (I'll deploy files myself)"
echo "4) Exit (I'll deploy later)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}🚀 Deploying to Vercel...${NC}"
        echo ""
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "Logging in to Vercel..."
        vercel login
        
        echo ""
        echo "Deploying to production..."
        vercel --prod
        
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo "Your site is now live! Check the URL above."
        ;;
        
    2)
        echo ""
        echo -e "${GREEN}🚀 Deploying to Netlify...${NC}"
        echo ""
        
        # Check if Netlify CLI is installed
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "Logging in to Netlify..."
        netlify login
        
        echo ""
        echo "Deploying to production..."
        netlify deploy --prod
        
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo "Your site is now live! Check the URL above."
        ;;
        
    3)
        echo ""
        echo -e "${YELLOW}📦 Manual Deployment Instructions:${NC}"
        echo ""
        echo "Your production files are in the 'dist' folder."
        echo ""
        echo -e "${GREEN}What to upload:${NC}"
        echo "  ✅ Upload everything inside the 'dist' folder"
        echo "  ✅ Upload to your web host's public folder (public_html, www, etc.)"
        echo ""
        echo -e "${RED}What NOT to upload:${NC}"
        echo "  ❌ Don't upload node_modules"
        echo "  ❌ Don't upload src"
        echo "  ❌ Don't upload package.json"
        echo ""
        echo "📋 Files ready in: $(pwd)/dist"
        echo ""
        echo "🔧 Don't forget to configure your web server for SPA routing!"
        echo "See DEPLOYMENT_GUIDE.md for Apache/.htaccess or Nginx config."
        ;;
        
    4)
        echo ""
        echo "No problem! Your production build is ready in the 'dist' folder."
        echo "Deploy whenever you're ready using the instructions in DEPLOYMENT_GUIDE.md"
        ;;
        
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🎉 Deployment Process Complete!                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📚 For more information, see DEPLOYMENT_GUIDE.md"
echo ""
echo -e "${GREEN}✅ Backend API:${NC} Already deployed on Supabase"
echo -e "${GREEN}✅ Database:${NC} Already deployed on Supabase"
echo -e "${GREEN}✅ Frontend:${NC} Just deployed!"
echo ""
echo "🧪 Test your live site:"
echo "  - Homepage"
echo "  - Product listings"
echo "  - Shopping cart"
echo "  - Checkout process"
echo "  - Admin panel"
echo ""
echo "🔐 Security checklist:"
echo "  - [ ] HTTPS enabled (SSL certificate)"
echo "  - [ ] Admin panel secured"
echo "  - [ ] Payment gateway tested"
echo "  - [ ] Email notifications working"
echo ""
echo "Happy selling! 🛒💰"
