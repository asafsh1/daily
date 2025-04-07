const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');

// MongoDB Atlas information
const username = "asafsh1";
const password = "Aa123456";
const clusterName = "cluster0";

// Test multiple MongoDB Atlas regions directly
// These are common MongoDB Atlas server IPs
const possibleIPs = [
  // North America
  '3.213.158.155',
  '18.211.135.226', 
  '18.232.152.199',
  // Europe
  '3.10.54.177',
  '18.200.164.193',
  '3.121.192.223',
  // Asia
  '54.199.204.132',
  '54.95.218.105',
  '54.178.26.71',
];

// Try to connect with each IP directly
async function attemptDirectConnections() {
  console.log("Starting direct connection attempts to MongoDB Atlas servers");
  
  // Create a results file
  const resultsFile = 'mongo-connection-results.txt';
  fs.writeFileSync(resultsFile, `MongoDB Atlas Connection Test Results\n${'='.repeat(40)}\n\n`);
  
  // Try each IP
  for (let i = 0; i < possibleIPs.length; i++) {
    const ip = possibleIPs[i];
    const connectionString = `mongodb://${username}:${password}@${ip}:27017/?authSource=admin&ssl=true`;
    
    console.log(`\nAttempt ${i+1}/${possibleIPs.length}: Connecting to ${ip}...`);
    
    try {
      // First do a ping test
      console.log(`Testing network connectivity to ${ip}...`);
      await pingTest(ip);
      
      // Try mongoose connection
      console.log(`Connecting to MongoDB at ${ip}...`);
      const conn = await mongoose.connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        ssl: true,
        authSource: 'admin'
      });
      
      // If successful
      console.log(`✅ SUCCESS: Connected to MongoDB at ${ip}`);
      fs.appendFileSync(resultsFile, `SUCCESS: Connected to ${ip}\n`);
      fs.appendFileSync(resultsFile, `Host: ${conn.connection.host}\n`);
      fs.appendFileSync(resultsFile, `Port: ${conn.connection.port}\n`);
      fs.appendFileSync(resultsFile, `Ready state: ${conn.connection.readyState}\n\n`);
      
      // Disconnect
      await mongoose.connection.close();
      console.log('Connection closed');
      
      // Success - let's update our configuration
      createSuccessConfig(ip);
      return true;
    } catch (err) {
      console.error(`❌ ERROR: Connection to ${ip} failed: ${err.message}`);
      fs.appendFileSync(resultsFile, `FAILED: ${ip} - ${err.message}\n\n`);
      
      // Close any open connection
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    }
  }
  
  console.log(`\nAll connection attempts failed. See ${resultsFile} for details.`);
  return false;
}

// Create a config file with successful direct connection
function createSuccessConfig(ip) {
  const successConfig = {
    mongoURI: `mongodb://${username}:${password}@${ip}:27017/?authSource=admin&ssl=true`,
    jwtSecret: "mysecrettoken",
    directConnection: true,
    successIP: ip
  };
  
  fs.writeFileSync('config/direct-connection.json', JSON.stringify(successConfig, null, 2));
  console.log('Created direct connection config file: config/direct-connection.json');
  console.log('To use it, update backend/config/db.js to use this file instead of default.json');
}

// Ping test to check network connectivity
function pingTest(ip) {
  return new Promise((resolve, reject) => {
    exec(`ping -c 1 -W 2 ${ip}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`Ping to ${ip} failed: ${stderr}`);
        resolve(false); // We'll still try the connection even if ping fails
      } else {
        console.log(`Ping to ${ip} successful`);
        resolve(true);
      }
    });
  });
}

// Run the test
console.log('MongoDB Atlas Direct Connection Test');
console.log('===================================');
attemptDirectConnections().then(success => {
  console.log(success ? 'Found a working direct connection!' : 'All connection attempts failed');
  process.exit(0);
}).catch(err => {
  console.error('Error in connection test:', err);
  process.exit(1);
}); 