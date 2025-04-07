const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the connection string from config
    const mongoURI = config.get('mongoURI');
    
    // Remove credential details from log
    const redactedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Connection URI: ${redactedURI}`);
    
    // Make sure it's using the correct cluster hostname
    if (!mongoURI.includes('lyz67.mongodb.net')) {
      console.warn('⚠️ Warning: MongoDB URI might be using the wrong cluster hostname!');
      console.warn('URI should contain "lyz67.mongodb.net" for the correct cluster.');
    }
    
    // Connect to MongoDB with standard options
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout for slow connections
      connectTimeoutMS: 30000
    });
    
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`MongoDB Atlas connection error: ${err.message}`);
    
    // If the error contains "querySrv ENOTFOUND", it's a DNS resolution issue
    if (err.message.includes('querySrv ENOTFOUND') || err.message.includes('ENOTFOUND')) {
      console.warn('⚠️ DNS resolution issue detected. Trying with direct connection...');
      
      try {
        // Get the MongoDB URI and convert it to a direct connection string
        const mongoURI = config.get('mongoURI');
        
        // Parse the URI to get username, password, and hostname
        const uri = new URL(mongoURI);
        const username = uri.username;
        const password = uri.password;
        const hostname = uri.hostname.replace('cluster0.', '');
        
        // Create direct connection strings to the replica set members
        const directURI = `mongodb://${username}:${password}@cluster0-shard-00-00.${hostname}:27017,cluster0-shard-00-01.${hostname}:27017,cluster0-shard-00-02.${hostname}:27017/admin?ssl=true&replicaSet=atlas-${hostname.substring(0, 2)}&authSource=admin`;
        
        // Log the direct connection URI (redacted)
        const redactedDirectURI = directURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`Trying direct connection URI: ${redactedDirectURI}`);
        
        // Connect with the direct URI
        const conn = await mongoose.connect(directURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 30000,
          connectTimeoutMS: 30000,
          ssl: true
        });
        
        console.log(`✅ MongoDB Atlas connected via direct URI: ${conn.connection.host}`);
        return true;
      } catch (directErr) {
        console.error(`Direct connection attempt failed: ${directErr.message}`);
      }
    }
    
    // If all MongoDB Atlas connection attempts failed, try connecting to local MongoDB
    try {
      console.log('⚠️ Attempting to connect to local MongoDB instance...');
      const conn = await mongoose.connect('mongodb://localhost:27017/shipment-tracker', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log(`⚠️ WARNING: Connected to local database (${conn.connection.host}). Data will not be synchronized with production.`);
      console.log('⚠️ If you want to use your production data, ensure MongoDB Atlas credentials are correct.');
      return true;
    } catch (localErr) {
      console.error(`Local database connection failed: ${localErr.message}`);
      console.error('❌ All database connection attempts failed.');
      process.exit(1);
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB; 