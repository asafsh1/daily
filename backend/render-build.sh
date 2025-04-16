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

# Create a symbolic link if the file structure is problematic
echo "Creating symbolic link from /opt/render/project/src to the current directory..."
mkdir -p /opt/render/project/src
ln -sf $(pwd)/* /opt/render/project/src/

# Add debug messages
echo "Verifying file location after symlinks..."
ls -la /opt/render/project/src/

# Print success message
echo "Backend build completed successfully" 