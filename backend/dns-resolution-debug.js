const dns = require('dns');

// Set DNS servers for better MongoDB Atlas connectivity
const DNS_SERVERS = [
  '8.8.8.8',  // Google DNS
  '8.8.4.4',  // Google DNS backup
  '1.1.1.1',  // Cloudflare
  '1.0.0.1'   // Cloudflare backup
];

dns.setServers(DNS_SERVERS);
console.log('DNS Servers:', DNS_SERVERS);

// Test DNS resolution for MongoDB host
const testDNSResolution = async (hostname) => {
  try {
    console.log(`Testing DNS resolution for ${hostname}...`);
    const addresses = await dns.promises.resolve(hostname);
    console.log(`✅ DNS resolution successful for ${hostname}:`, addresses);
    return true;
  } catch (error) {
    console.error(`DNS Resolution failed: ${error.message}`);
    return false;
  }
};

// Extract MongoDB hostname for testing
if (process.env.MONGODB_URI) {
  const matches = process.env.MONGODB_URI.match(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@([^/]+)/);
  if (matches && matches[2]) {
    const hostname = matches[2];
    console.log(`Testing DNS resolution for MongoDB host: ${hostname}`);
    testDNSResolution(hostname);
  }
}

// Export functions for use in server.js
module.exports = {
    testMongoDBConnection: testDNSResolution,
    dnsServers: DNS_SERVERS
}; 