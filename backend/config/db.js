const mongoose = require('mongoose');
const config = require('config');
const dns = require('dns');

// Set DNS servers to Google's for better resolution
// This helps with MongoDB Atlas DNS resolution issues on some cloud platforms
dns.setServers([
  '8.8.8.8',
  '8.8.4.4'
]);

// Function to validate MongoDB URI format
const validateMongoURI = (uri) => {
  if (!uri) return false;
  
  // Basic format validation
  const regex = /^mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/]+\/[^?]+(\?.*)?$/;
  return regex.test(uri);
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the connection string from environment variables or config
    const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');
    
    if (!mongoURI) {
      console.error('MongoDB URI is not defined in environment variables or config');
      process.exit(1);
    }
    
    // Validate URI format
    if (!validateMongoURI(mongoURI)) {
      console.error('MongoDB URI format appears invalid:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
      console.warn('Attempting to connect anyway but this may fail.');
    }
    
    // Remove credential details from log
    const redactedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Connection URI: ${redactedURI}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test DNS resolution for the MongoDB host
    try {
      const hostPart = mongoURI.split('@')[1].split('/')[0];
      console.log(`Testing DNS resolution for MongoDB host: ${hostPart}`);
      
      const addresses = await new Promise((resolve, reject) => {
        dns.resolve(hostPart, (err, addresses) => {
          if (err) {
            console.error(`DNS resolution failed: ${err.message}`);
            // Don't reject, we'll try to connect anyway
            resolve([]);
          } else {
            console.log(`DNS resolved successfully to: ${addresses.join(', ')}`);
            resolve(addresses);
          }
        });
      });
    } catch (dnsErr) {
      console.error('Error testing DNS resolution:', dnsErr.message);
      // Continue anyway
    }
    
    // Set global mongoose options for better stability
    mongoose.set('strictQuery', false);
    
    // Configure connection options with longer timeouts for cloud deployments
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout for server selection
      connectTimeoutMS: 30000, // Increased timeout for initial connection
      socketTimeoutMS: 60000, // Increased socket timeout
      // Specify family to force IPv4 which can help with some DNS issues
      family: 4,
      // Other reliability settings
      maxPoolSize: 50,
      minPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      autoIndex: true,
    };

    // Connect to MongoDB Atlas
    console.log('Initiating MongoDB connection...');
    const conn = await mongoose.connect(mongoURI, options);
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
    return true;
    
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.error('Connection failure details:', err);
    
    // Specific error handling for common MongoDB connection issues
    if (err.name === 'MongoServerSelectionError') {
      console.error('Server selection timed out. This may be due to:');
      console.error('1. DNS resolution failure');
      console.error('2. Firewall or network blocking the connection');
      console.error('3. MongoDB Atlas cluster is paused or unavailable');
      console.error('4. Incorrect credentials or database name');
    }
    
    // Don't exit the process on connection failure in production
    // This allows the API to still serve non-DB dependent routes
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    
    return false;
  }
};

// Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Database connection successful - all functionality available');
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