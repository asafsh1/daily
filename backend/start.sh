#!/bin/bash

echo "===================================="
echo "Restarting backend server"
echo "===================================="

# Stop any running node processes
echo "Stopping any running node processes..."
pkill -f node || true

echo "Starting server..."

# Set MongoDB Atlas specific environment variables
export NODE_OPTIONS="--dns-result-order=ipv4first"
export MONGODB_DIRECT_CONNECTION=true

# Start the server
npm run dev 