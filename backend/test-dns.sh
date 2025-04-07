#!/bin/bash

CLUSTER_HOSTNAME="cluster0.aqbmxvz.mongodb.net"
SRV_HOSTNAME="_mongodb._tcp.cluster0.aqbmxvz.mongodb.net"

echo "Testing DNS resolution for MongoDB Atlas"
echo "========================================"

# Test normal DNS resolution
echo ""
echo "1. Basic hostname lookup for ${CLUSTER_HOSTNAME}"
echo "------------------------------------------------"
echo "Using ping..."
ping -c 1 ${CLUSTER_HOSTNAME}
echo ""
echo "Using dig..."
dig ${CLUSTER_HOSTNAME}
echo ""
echo "Using host..."
host ${CLUSTER_HOSTNAME}
echo ""

# Test SRV records
echo "2. SRV record lookup for ${SRV_HOSTNAME}"
echo "------------------------------------------------"
echo "Using dig SRV..."
dig SRV ${SRV_HOSTNAME}
echo ""
echo "Using host -t SRV..."
host -t SRV ${SRV_HOSTNAME}

# Test using different DNS servers
echo ""
echo "3. Testing with Google's DNS servers (8.8.8.8)"
echo "------------------------------------------------"
echo "SRV lookup using Google DNS..."
dig @8.8.8.8 SRV ${SRV_HOSTNAME}
echo ""
echo "A record lookup using Google DNS..."
dig @8.8.8.8 ${CLUSTER_HOSTNAME}

# Test using Cloudflare's DNS servers
echo ""
echo "4. Testing with Cloudflare's DNS servers (1.1.1.1)"
echo "------------------------------------------------"
echo "SRV lookup using Cloudflare DNS..."
dig @1.1.1.1 SRV ${SRV_HOSTNAME}
echo ""
echo "A record lookup using Cloudflare DNS..."
dig @1.1.1.1 ${CLUSTER_HOSTNAME}

echo ""
echo "DNS Test Complete" 