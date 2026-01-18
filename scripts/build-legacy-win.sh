#!/bin/bash

# Build script for legacy Windows (Windows 7/8/Server 2012)
# Uses Electron 22.x which is the last version to support these OS

set -e

echo "=========================================="
echo "Building Marix for Legacy Windows"
echo "Using Electron 22.x for Win7/8/Server 2012"
echo "=========================================="

# Save current electron version
CURRENT_ELECTRON=$(node -p "require('./package.json').devDependencies.electron")
echo "Current Electron version: $CURRENT_ELECTRON"

# Backup package.json and package-lock.json
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || true

# Install Electron 22 and downgrade ESM-only packages to CommonJS versions
echo ""
echo "Installing legacy-compatible packages..."
echo "  - Electron 22.3.27 (legacy Windows support)"
echo "  - electron-store 8.1.0 (CommonJS version)"
npm install --save-dev electron@22.3.27 --ignore-scripts
npm install --save electron-store@8.1.0 --ignore-scripts

# Build main process with webpack (bundle to CommonJS for legacy support)
echo ""
echo "Building main process with webpack (legacy bundle)..."
node --max-old-space-size=4096 ./node_modules/webpack/bin/webpack.js --config webpack.main.legacy.js

# Build renderer with legacy config (ES5 compatible)
echo ""
echo "Building renderer (legacy compatible)..."
node --max-old-space-size=4096 ./node_modules/webpack/bin/webpack.js --config webpack.renderer.legacy.js

# Package for Windows with legacy config (skip native rebuild)
echo ""
echo "Packaging for Windows (legacy)..."
npx electron-builder --win --config electron-builder-legacy.json

# Restore original versions
echo ""
echo "Restoring original package versions..."
mv package.json.backup package.json
mv package-lock.json.backup package-lock.json 2>/dev/null || true
npm install --ignore-scripts

echo ""
echo "=========================================="
echo "Legacy Windows build complete!"
echo "Output: release-legacy/"
echo "=========================================="
