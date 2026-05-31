#!/bin/bash

# 🔍 Build Diagnostic Script
# This helps identify why the dist folder isn't being created

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🔍 Build Diagnostic Tool                             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${BLUE}[1/6]${NC} Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo "Install from: https://nodejs.org"
    exit 1
fi
echo ""

# Step 2: Check if package.json exists
echo -e "${BLUE}[2/6]${NC} Checking package.json..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json found${NC}"
else
    echo -e "${RED}❌ package.json not found!${NC}"
    echo "Are you in the correct directory?"
    exit 1
fi
echo ""

# Step 3: Check if node_modules exists
echo -e "${BLUE}[3/6]${NC} Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules folder exists${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules not found${NC}"
    echo "Running npm install..."
    npm install
fi
echo ""

# Step 4: Clean old build
echo -e "${BLUE}[4/6]${NC} Cleaning old build..."
if [ -d "dist" ]; then
    echo -e "${YELLOW}⚠️  Old dist folder found - removing...${NC}"
    rm -rf dist
    echo -e "${GREEN}✅ Cleaned${NC}"
else
    echo -e "${GREEN}✅ No old dist folder${NC}"
fi
echo ""

# Step 5: Attempt build
echo -e "${BLUE}[5/6]${NC} Building application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run build 2>&1 | tee build.log

BUILD_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 6: Check results
echo -e "${BLUE}[6/6]${NC} Checking results..."
echo ""

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Build command completed without errors${NC}"
    echo ""
    
    if [ -d "dist" ]; then
        echo -e "${GREEN}🎉 SUCCESS! dist folder created!${NC}"
        echo ""
        echo "📂 Contents of dist folder:"
        ls -lh dist/
        echo ""
        echo "📊 Folder size:"
        du -sh dist/
        echo ""
        echo -e "${GREEN}✅ Ready to deploy!${NC}"
        echo ""
        echo "Your files are in: $(pwd)/dist"
    else
        echo -e "${RED}❌ Build succeeded but dist folder not found!${NC}"
        echo ""
        echo "This is unusual. Checking vite.config.ts..."
        if grep -q "outDir" vite.config.ts 2>/dev/null; then
            echo "Found custom outDir configuration:"
            grep "outDir" vite.config.ts
        else
            echo "No custom outDir found - should default to 'dist'"
        fi
    fi
else
    echo -e "${RED}❌ Build FAILED with errors!${NC}"
    echo ""
    echo "Common issues:"
    echo ""
    echo "1. Missing dependencies:"
    echo "   Solution: npm install"
    echo ""
    echo "2. TypeScript errors:"
    echo "   Check the errors above in red"
    echo ""
    echo "3. Import errors:"
    echo "   Check file paths and imports"
    echo ""
    echo "📋 Build log saved to: build.log"
    echo "   Review it with: cat build.log"
    echo ""
    echo "🔧 Try fixing the errors above and run this script again"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Diagnostic Complete                                   ║"
echo "╚════════════════════════════════════════════════════════╝"
