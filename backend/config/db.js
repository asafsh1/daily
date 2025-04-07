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
    
    // Check if we should use direct connection to bypass SRV issues
    const useDirectConnection = mongoURI.includes('directConnection=true') || 
                               process.env.MONGODB_DIRECT_CONNECTION === 'true';
    
    // If using SRV connection
    if (mongoURI.includes('mongodb+srv://') && !useDirectConnection) {
      try {
        console.log('Attempting to connect using SRV record...');
        
        const conn = await mongoose.connect(mongoURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000, // Reduced timeout for faster fallback
          connectTimeoutMS: 10000
        });
        
        console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
        return true;
      } catch (srvErr) {
        console.error(`MongoDB SRV connection error: ${srvErr.message}`);
        
        if (srvErr.message.includes('ENOTFOUND')) {
          console.warn('⚠️ DNS resolution issue detected. Trying with direct connection...');
          // Continue to direct connection fallback
        } else {
          throw srvErr; // Rethrow non-DNS errors
        }
      }
    }
    
    // Try direct connection if SRV failed or direct connection was requested
    if (mongoURI.includes('mongodb+srv://') || useDirectConnection) {
      try {
        // Convert SRV URI to direct URI
        let directURI = mongoURI;
        
        // Only convert if it's an SRV URI
        if (mongoURI.includes('mongodb+srv://')) {
          // Extract the cluster name from the URI
          const uriParts = mongoURI.split('@')[1].split('/');
          const clusterDomain = uriParts[0];
          const dbName = uriParts[1].split('?')[0] || 'admin';
          
          // Replace mongodb+srv:// with mongodb:// and add direct connection ports
          directURI = mongoURI
            .replace('mongodb+srv://', 'mongodb://')
            .replace(clusterDomain, `${clusterDomain}:27017`);
          
          console.log(`Created direct connection URI (credentials hidden)`);
        }
        
        const conn = await mongoose.connect(directURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000
        });
        
        console.log(`✅ MongoDB Atlas connected via direct URI: ${conn.connection.host}`);
        return true;
      } catch (directErr) {
        console.error(`Direct connection attempt failed: ${directErr.message}`);
        // Fall through to local connection
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
      console.log('⚠️ To use production data, ensure MongoDB Atlas credentials are correct.');
      return true;
    } catch (localErr) {
      console.error(`Local database connection failed: ${localErr.message}`);
      console.error('❌ All database connection attempts failed.');
      process.exit(1);
    }
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
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