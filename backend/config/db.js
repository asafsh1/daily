const mongoose = require('mongoose');
const config = require('config');

// Get MongoDB URI with multiple fallbacks
const getMongoURI = () => {
  // Priority 1: Environment variable
  if (process.env.MONGO_URI) {
    console.log('Using MongoDB URI from environment variable');
    return process.env.MONGO_URI;
  }
  
  // Priority 2: Config file
  try {
    const uri = config.get('mongoURI');
    console.log('Using MongoDB URI from config file');
    return uri;
  } catch (err) {
    console.error('Error loading MongoDB URI from config:', err.message);
  }
  
  // Priority 3: Default localhost
  console.log('Using fallback localhost MongoDB URI');
  return 'mongodb://localhost:27017/daily-app';
};

// Connect to MongoDB with retries and fallback
const connectDB = async () => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds
  
  // First try the primary URI
  const primaryURI = getMongoURI();
  console.log(`Primary MongoDB URI: ${primaryURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`); // Hide password
  
  // Try to connect using SRV-less direct connection pattern if we have an SRV URL
  // This helps bypass DNS SRV lookup issues
  let urisToTry = [primaryURI];
  
  // Add direct connection URLs as a fallback if using SRV format
  if (primaryURI.includes('mongodb+srv://')) {
    // Extract credentials and cluster name from SRV URL 
    const match = primaryURI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
    if (match) {
      const [_, username, password, host] = match;
      // Construct direct connection URLs to specific MongoDB Atlas nodes
      // Usually the pattern is cluster0-shard-00-00, cluster0-shard-00-01, cluster0-shard-00-02
      const clusterName = host.split('.')[0]; // e.g., "cluster0" from "cluster0.aqbmxvz.mongodb.net"
      const domain = host.split('.').slice(1).join('.'); // e.g., "aqbmxvz.mongodb.net"
      
      // Add direct connection URLs (no SRV lookup required)
      for (let i = 0; i < 3; i++) {
        const directURI = `mongodb://${username}:${password}@${clusterName}-shard-00-0${i}.${domain}:27017/?ssl=true&authSource=admin&replicaSet=${clusterName}`;
        urisToTry.push(directURI);
      }
      
      console.log(`Created ${urisToTry.length - 1} direct connection URLs as fallbacks`);
    }
  }
  
  // Try all connection URIs in sequence
  for (const [index, uri] of urisToTry.entries()) {
    const isFallback = index > 0;
    const displayURI = uri.replace(/\/\/([^:]+):[^@]+@/, '//***:***@'); // Hide password
    
    // Try the connection with retries
    for (let attempt = 1; attempt <= (isFallback ? 1 : MAX_RETRIES); attempt++) {
      console.log(`MongoDB connection attempt ${attempt} of ${isFallback ? 1 : MAX_RETRIES} to ${isFallback ? 'fallback' : 'primary'} URI ${index}...`);
      
      try {
        const conn = await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000, // 10 seconds
          connectTimeoutMS: 10000, // 10 seconds
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log('✅ Database connection successful - all functionality available');
        return true;
      } catch (err) {
        console.error(`Connection attempt ${attempt} to URI ${index} failed:`, err.message);
        
        if (attempt < MAX_RETRIES && !isFallback) {
          console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
  }
  
  // If we get here, we've tried all connection strings including fallbacks
  console.log('All remote connection attempts failed. Trying localhost fallback...');
  
  // Try localhost as final fallback
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/daily-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds
    });
    
    console.log(`Connected to local MongoDB: ${conn.connection.host}`);
    console.log('✅ Database connection successful - all functionality available (using local database)');
    return true;
  } catch (localErr) {
    console.error('Failed to connect to local MongoDB:', localErr.message);
    
    // Final fallback - operate in limited functionality mode
    console.error('All MongoDB connection attempts failed. Running with limited functionality.');
    return false;
  }
};

// Handle connection events
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose disconnected on app termination');
  process.exit(0);
});

module.exports = connectDB; 