const dns = require('dns');
const { promisify } = require('util');

// Set DNS servers to include Google and Cloudflare DNS
dns.setServers([
    '8.8.8.8',    // Google DNS
    '8.8.4.4',    // Google DNS backup
    '1.1.1.1',    // Cloudflare DNS
    '1.0.0.1'     // Cloudflare DNS backup
]);

// Promisify DNS functions for easier use
const lookup = promisify(dns.lookup);
const resolve = promisify(dns.resolve);

// Log DNS servers being used
console.log('DNS Servers:', dns.getServers());

// Function to test MongoDB Atlas DNS resolution
async function testMongoDBConnection(host) {
    try {
        console.log(`Testing DNS resolution for ${host}...`);
        
        // Try DNS lookup
        const address = await lookup(host);
        console.log('DNS Lookup result:', address);
        
        // Try DNS resolve
        const addresses = await resolve(host);
        console.log('DNS Resolve results:', addresses);
        
        return true;
    } catch (error) {
        console.error('DNS Resolution failed:', error.message);
        return false;
    }
}

// Export functions for use in server.js
module.exports = {
    testMongoDBConnection,
    dnsServers: dns.getServers()
}; 