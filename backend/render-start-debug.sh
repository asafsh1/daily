#!/usr/bin/env bash
# Debug start script for Render

# Exit on error
set -e

# Print environment info
echo "=========== ENVIRONMENT INFO ==========="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo "HOST: $HOSTNAME"

# Check file locations
echo "=========== FILE LOCATIONS ==========="
echo "Current directory contents:"
ls -la

echo "Checking build directory:"
ls -la /opt/build/repo || echo "Build directory not found"

echo "Checking render project directory:"
ls -la /opt/render/project || echo "Render project directory not found"

echo "Checking for index.js in various locations:"
find /opt -name "index.js" -type f 2>/dev/null | while read f; do
  echo "Found: $f"
done

# Try to start from different locations
echo "=========== ATTEMPTING TO START SERVER ==========="

if [ -f "index.js" ]; then
  echo "Found index.js in current directory, starting..."
  node index.js
  exit $?
fi

if [ -f "/opt/build/repo/index.js" ]; then
  echo "Found index.js in /opt/build/repo, starting..."
  cd /opt/build/repo
  node index.js
  exit $?
fi

# If we get here, we couldn't find the index.js file
echo "ERROR: Could not find index.js. Exiting."
exit 1 