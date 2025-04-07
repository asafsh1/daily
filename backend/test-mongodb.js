const mongoose = require('mongoose');
const config = require('config');
const dns = require('dns');

// Function to test direct DNS resolution
const testDns = async (hostname) => {
  return new Promise((resolve, reject) => {
    console.log(`Testing DNS resolution for: ${hostname}`);
    
    // Try to resolve via DNS lookup
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error(`DNS lookup failed: ${err.message}`);
        reject(err);
      } else {
        console.log(`DNS lookup successful: ${hostname} -> ${address}`);
        resolve(address);
      }
    });
  });
};

// Function to test connecting to MongoDB
const testMongoConnection = async () => {
  try {
    // Get connection string
    const mongoURI = config.get('mongoURI');
    console.log(`Testing connection to: ${mongoURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`);
    
    // Parse connection string
    if (mongoURI.includes('mongodb+srv://')) {
      const [prefix, rest] = mongoURI.split('@');
      const hostname = rest.split('/')[0];
      
      // Test DNS resolution
      try {
        await testDns(hostname);
        console.log('DNS resolution successful!');
      } catch (dnsErr) {
        console.error('DNS resolution failed, but will try MongoDB connection anyway');
      }
      
      // Test resolving Atlas SRV records
      try {
        console.log(`Testing MongoDB SRV records for: _mongodb._tcp.${hostname}`);
        const records = await new Promise((resolve, reject) => {
          dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
            if (err) {
              console.error(`SRV record lookup failed: ${err.message}`);
              reject(err);
            } else {
              console.log(`SRV records found: ${addresses.length} entries`);
              resolve(addresses);
            }
          });
        });
        
        if (records && records.length > 0) {
          console.log('SRV Record details:');
          records.forEach((record, i) => {
            console.log(`  Server ${i+1}: ${record.name}:${record.port}`);
            // Try to resolve each SRV target
            testDns(record.name).catch(e => console.log(`  Cannot resolve ${record.name}: ${e.message}`));
          });
        }
      } catch (srvErr) {
        console.error('SRV record lookup failed');
      }
    }
    
    // Try MongoDB connection
    console.log('\nAttempting MongoDB connection...');
    const connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    console.log(`MongoDB connection successful! Connected to: ${connection.connection.host}`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
  } catch (err) {
    console.error(`MongoDB connection test failed: ${err.message}`);
    
    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
      console.log('\n⚠️ DNS RESOLUTION ISSUE DETECTED!');
      console.log('Try one of these solutions:');
      console.log('1. Set custom DNS servers on your machine to Google (8.8.8.8, 8.8.4.4) or Cloudflare (1.1.1.1)');
      console.log('2. Restart your network connection or router');
      console.log('3. Check if your ISP is blocking MongoDB Atlas domains');
      console.log('4. Try connecting through a VPN or different network');
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
};

// Run the test
console.log('MongoDB Connection Test Script');
console.log('=============================');
testMongoConnection(); 