#!/bin/bash

echo "===================================="
echo "Starting backend server"
echo "===================================="

# Stop any running node processes
echo "Stopping any running node processes..."
pkill -f node || true

echo "Starting server..."

# Start the server
cd /opt/render/project/src
node server.js 