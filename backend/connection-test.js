/**
 * MongoDB Connection Test Script
 * 
 * This script is used during deployment to verify MongoDB connectivity.
 * It tests DNS resolution and direct connection to MongoDB Atlas.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers to Google's for better resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('='.repeat(50));
console.log('MongoDB Connection Test');
console.log('='.repeat(50));

// Get the MongoDB URI
const mongoURI = process.env.MONGODB_URI || require('config').get('mongoURI');
const redactedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log(`Using connection string: ${redactedURI}`);

// Extract hostname from connection string
const matches = mongoURI.match(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@([^/]+)/);
if (!matches || !matches[2]) {
  console.error('Failed to extract hostname from connection string');
  process.exit(1);
}

const hostname = matches[2];
console.log(`Extracted hostname: ${hostname}`);

// Test DNS resolution
console.log('\n--- DNS Resolution Test ---');
dns.resolve(hostname, (err, addresses) => {
  if (err) {
    console.error(`DNS resolution failed: ${err.message}`);
    console.log('Attempting alternative DNS resolution methods...');
    
    dns.lookup(hostname, { family: 4 }, (err2, address) => {
      if (err2) {
        console.error(`DNS lookup also failed: ${err2.message}`);
      } else {
        console.log(`DNS lookup successful: ${hostname} -> ${address}`);
      }
      
      // Continue with connection test regardless
      testConnection();
    });
  } else {
    console.log(`DNS resolution successful: ${hostname} -> ${addresses.join(', ')}`);
    testConnection();
  }
});

// Test actual MongoDB connection
async function testConnection() {
  console.log('\n--- MongoDB Connection Test ---');
  
  try {
    console.log('Connecting to MongoDB...');
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      family: 4
    };
    
    const connection = await mongoose.connect(mongoURI, options);
    console.log(`✅ Connected successfully to: ${connection.connection.host}`);
    console.log(`Database name: ${connection.connection.name}`);
    console.log(`Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    
    // Try a simple database operation
    console.log('\n--- Testing Database Operation ---');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Collections in database: ${collections.map(c => c.name).join(', ') || 'None'}`);
    
    console.log('\n✅ TEST PASSED: MongoDB connection is working properly');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error('Error details:', error);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nServer selection error. This could be due to:');
      console.error('1. Network connectivity issues');
      console.error('2. Firewall blocking the connection');
      console.error('3. MongoDB Atlas cluster is paused or unavailable');
      console.error('4. Incorrect credentials or cluster name');
    }
    
    console.error('\n❌ TEST FAILED: Unable to connect to MongoDB');
    process.exit(1);
  }
} 