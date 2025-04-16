#!/usr/bin/env bash
# Render build script for the backend

# Exit on error
set -e

# Print Node.js version
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Print current directory
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Install dependencies
echo "Installing dependencies..."
npm install

# Create the destination directory
echo "Creating destination directory..."
mkdir -p /opt/render/project/src

# Copy all files to the expected location
echo "Copying all files to /opt/render/project/src/..."
cp -r * /opt/render/project/src/

# Create symbolic links to be extra sure
echo "Creating symbolic links for critical files..."
ln -sf $(pwd)/index.js /opt/render/project/src/index.js
ln -sf $(pwd)/server.js /opt/render/project/src/server.js
ln -sf $(pwd)/package.json /opt/render/project/src/package.json

# Add debug messages
echo "Verifying file location after copy..."
ls -la /opt/render/project/src/

echo "Checking for index.js specifically:"
ls -la /opt/render/project/src/index.js || echo "index.js not found!"

# Make sure we have the correct path
echo "Current working directory path: $(pwd)"
echo "Destination directory path: /opt/render/project/src"

# Print success message
echo "Backend build completed successfully" 