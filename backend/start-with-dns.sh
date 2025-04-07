#!/bin/bash

# Start server with custom DNS settings
echo "Starting server with custom DNS settings..."

# Kill any running node processes
pkill -f node

# Set DNS servers to Google and Cloudflare
echo "Setting DNS servers..."
cat > .resolv.conf << EOF
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
nameserver 1.0.0.1
EOF

# Set environment variables to use custom resolv.conf
export NODE_EXTRA_CA_CERTS=./ca-certificates.crt
export NODE_OPTIONS=--dns-result-order=ipv4first
export HOSTALIASES=./hosts
export RES_OPTIONS="rotate timeout:1 attempts:5"

# Run DNS test first
echo "Testing MongoDB connection..."
node test-mongodb.js

# Start server
echo "Starting server..."
npm run dev 