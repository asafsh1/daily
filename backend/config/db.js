const mongoose = require('mongoose');
const config = require('config');
const dns = require('dns');
const { promisify } = require('util');

// Promisify DNS functions
const dnsResolve = promisify(dns.resolve);

// Set multiple DNS servers for better resolution
dns.setServers([
  '8.8.8.8',    // Google DNS
  '8.8.4.4',    // Google DNS backup
  '1.1.1.1',    // Cloudflare DNS
  '1.0.0.1'     // Cloudflare DNS backup
]);

// Function to validate MongoDB URI format
const validateMongoURI = (uri) => {
  if (!uri) return false;
  const regex = /^mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/]+\/[^?]+(\?.*)?$/;
  return regex.test(uri);
};

// Function to test DNS resolution
const testDNSResolution = async (host) => {
  try {
    const addresses = await dnsResolve(host);
    console.log(`✅ DNS resolution successful for ${host}:`, addresses);
    return true;
  } catch (error) {
    console.error(`❌ DNS resolution failed for ${host}:`, error.message);
    return false;
  }
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the connection string from environment variables or config
    const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');
    
    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined in environment variables or config');
    }
    
    // Validate URI format
    if (!validateMongoURI(mongoURI)) {
      console.error('MongoDB URI format appears invalid');
      console.warn('Attempting to connect anyway but this may fail.');
    }
    
    // Test DNS resolution for the MongoDB host
    const hostPart = mongoURI.split('@')[1].split('/')[0];
    const dnsResolved = await testDNSResolution(hostPart);
    
    if (!dnsResolved) {
      console.warn('DNS resolution failed, but attempting connection anyway...');
    }
    
    // Configure connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      family: 4,
      maxPoolSize: 50,
      minPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      autoIndex: true,
      // Add DNS seedlist options for better resolution
      dnsServer: '8.8.8.8',
      // Add connection pool options
      maxIdleTimeMS: 45000,
      maxConnecting: 2,
    };

    // Connect to MongoDB Atlas
    console.log('Initiating MongoDB connection...');
    const conn = await mongoose.connect(mongoURI, options);
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
    return true;
    
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    
    if (err.name === 'MongoServerSelectionError') {
      console.error('Server selection timed out. Possible causes:');
      console.error('1. DNS resolution failure - check network/firewall settings');
      console.error('2. MongoDB Atlas cluster is paused or unavailable');
      console.error('3. Invalid credentials or database name');
      
      // Try to get more diagnostic information
      const hostPart = process.env.MONGODB_URI?.split('@')[1]?.split('/')[0];
      if (hostPart) {
        console.log('Attempting DNS resolution test...');
        await testDNSResolution(hostPart);
      }
    }
    
    // Don't exit in production, allow API to serve non-DB routes
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    
    return false;
  }
};

// Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Database connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Database disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Database connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB; 