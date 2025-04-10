#!/bin/bash

echo "==================================================="
echo "RENDER DEPLOYMENT STARTUP SCRIPT"
echo "==================================================="

# Print current DNS setup
echo -e "\n--- Current DNS settings ---"
cat /etc/resolv.conf

# Use Google DNS servers for better MongoDB Atlas connectivity
echo -e "\n--- Setting up Google DNS servers ---"
echo "nameserver 8.8.8.8" > /tmp/resolv.conf
echo "nameserver 8.8.4.4" >> /tmp/resolv.conf
export RESOLV_PATH=/tmp/resolv.conf
echo "Custom resolv.conf created at $RESOLV_PATH"

# Print environment variables (redacted for security)
echo -e "\n--- Environment variables check ---"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "MONGODB_URI exists: $(if [ -n "$MONGODB_URI" ]; then echo "Yes"; else echo "No"; fi)"

# Run connection test
echo -e "\n--- Running MongoDB connection test ---"
node connection-test.js

# If test passes, start the server
if [ $? -eq 0 ]; then
  echo -e "\n--- Connection test successful, starting server ---"
  node server.js
else
  echo -e "\n--- Connection test failed, but will attempt to start server anyway ---"
  node server.js
fi 