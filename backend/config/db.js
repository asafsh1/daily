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
  
  // Get the MongoDB URI from config
  const primaryURI = getMongoURI();
  console.log(`Primary MongoDB URI: ${primaryURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`); // Hide password
  
  // Directly specify the connection strings to bypass DNS SRV lookup
  let connectionStrings = [];
  
  // For MongoDB Atlas, create direct connection strings to each node
  if (primaryURI.includes('mongodb+srv://')) {
    // Extract username, password, and cluster info from SRV URL
    const match = primaryURI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
    if (match) {
      const [_, username, password, host] = match;
      const clusterBase = host.split('.')[0]; // e.g., "cluster0"
      const domain = host.split('.').slice(1).join('.'); // e.g., "aqbmxvz.mongodb.net"
      
      // Add direct connection strings to all 3 replica set nodes
      connectionStrings = [
        `mongodb://${username}:${password}@${clusterBase}-shard-00-00.${domain}:27017,${clusterBase}-shard-00-01.${domain}:27017,${clusterBase}-shard-00-02.${domain}:27017/daily-app?ssl=true&replicaSet=${clusterBase}-shard-0&authSource=admin&retryWrites=true&w=majority`,
        // Add individual node connections as fallbacks
        `mongodb://${username}:${password}@${clusterBase}-shard-00-00.${domain}:27017/daily-app?ssl=true&authSource=admin`,
        `mongodb://${username}:${password}@${clusterBase}-shard-00-01.${domain}:27017/daily-app?ssl=true&authSource=admin`,
        `mongodb://${username}:${password}@${clusterBase}-shard-00-02.${domain}:27017/daily-app?ssl=true&authSource=admin`,
      ];
      
      console.log(`Created ${connectionStrings.length} direct connection strings to MongoDB Atlas nodes`);
    }
  } else {
    // If not an SRV URL, just use the provided URI
    connectionStrings.push(primaryURI);
  }
  
  // Always add localhost as final fallback
  connectionStrings.push('mongodb://localhost:27017/daily-app');
  
  // Try each connection string in sequence
  for (let i = 0; i < connectionStrings.length; i++) {
    const connectionString = connectionStrings[i];
    const isFallback = i > 0;
    const connectionType = i === 0 ? 'Primary' : 
                          i === connectionStrings.length - 1 ? 'Local fallback' : 
                          `Fallback ${i}`;
    
    console.log(`Trying MongoDB connection (${connectionType}): ${connectionString.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`);
    
    // Only retry the primary connection, try fallbacks just once
    const maxAttempts = isFallback ? 1 : MAX_RETRIES;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const conn = await mongoose.connect(connectionString, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000, // 10 seconds
          connectTimeoutMS: 10000, // 10 seconds
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        if (i === connectionStrings.length - 1) {
          console.log('⚠️ Connected to local development database. Your data will not be saved to the cloud.');
        } else if (i > 0) {
          console.log(`⚠️ Connected using fallback connection string ${i}`);
        } else {
          console.log('✅ Connected to primary MongoDB database');
        }
        
        return true;
      } catch (err) {
        console.error(`Connection attempt ${attempt} failed:`, err.message);
        
        if (attempt < maxAttempts) {
          console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
  }
  
  // If we get here, all connection attempts failed
  console.error('All MongoDB connection attempts failed!');
  return false;
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