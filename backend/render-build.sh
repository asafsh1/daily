#!/usr/bin/env bash
# Render build script for the backend

# Exit on error
set -e

# Print environment information
echo "=========== ENVIRONMENT INFO ==========="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

# Create a detailed directory listing
echo "=========== DIRECTORY CONTENTS ==========="
ls -la

# Install dependencies
echo "=========== INSTALLING DEPENDENCIES ==========="
npm install

# Create the expected directory structure
echo "=========== SETTING UP PROJECT STRUCTURE ==========="
mkdir -p /opt/render/project/src

# Be very explicit about what we're copying
echo "=========== COPYING PROJECT FILES ==========="
cp -v package.json /opt/render/project/src/
cp -v package-lock.json /opt/render/project/src/
cp -v index.js /opt/render/project/src/
cp -v server.js /opt/render/project/src/
cp -v dns-resolution-debug.js /opt/render/project/src/

# Create directories and copy contents
echo "=========== COPYING DIRECTORIES ==========="
mkdir -p /opt/render/project/src/src
cp -rv src/* /opt/render/project/src/src/

# Also directly copy the node_modules directory
echo "=========== COPYING NODE_MODULES ==========="
mkdir -p /opt/render/project/src/node_modules
cp -r node_modules/* /opt/render/project/src/node_modules/

# Also run npm install in the target directory to be safe
echo "=========== INSTALLING DEPENDENCIES IN TARGET DIRECTORY ==========="
cd /opt/render/project/src && npm install

# Double-check if files exists in target directory
echo "=========== VERIFYING PROJECT STRUCTURE ==========="
cd /opt/render/project/src
echo "Target directory contents:"
ls -la

echo "Checking for key files:"
[ -f index.js ] && echo "✓ index.js exists" || echo "✗ index.js MISSING"
[ -f server.js ] && echo "✓ server.js exists" || echo "✗ server.js MISSING"
[ -f package.json ] && echo "✓ package.json exists" || echo "✗ package.json MISSING"
[ -d src ] && echo "✓ src directory exists" || echo "✗ src directory MISSING"
[ -d node_modules ] && echo "✓ node_modules directory exists" || echo "✗ node_modules directory MISSING"

echo "Testing node path resolution:"
node -e "console.log('Node can execute JavaScript')"
node -e "try { require('./index.js'); console.log('✓ index.js can be required'); } catch(e) { console.error('✗ Error requiring index.js:', e.message); }"

# Print success message
echo "=========== BUILD COMPLETED ==========="
echo "Backend build completed successfully"
echo "Current directory: $(pwd)" 