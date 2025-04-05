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
  
  // Get the MongoDB URI
  const primaryURI = getMongoURI();
  console.log(`Primary MongoDB URI: ${primaryURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`); // Hide password
  
  // Determine if we're in development or production
  const isDev = process.env.NODE_ENV === 'development';
  
  // Define all the connection methods to try
  const connectionMethods = [];
  
  // Method 1: Direct standard MongoDB URI connection
  connectionMethods.push({
    name: 'Primary URI',
    uri: primaryURI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      connectTimeoutMS: 10000 // 10 seconds
    }
  });
  
  // Method 2: If it's an SRV URI, try direct connections to avoid DNS issues
  if (primaryURI.includes('mongodb+srv://')) {
    // Extract credentials and cluster name from SRV URL 
    const match = primaryURI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
    if (match) {
      const [_, username, password, host] = match;
      // Construct direct connection URLs to specific MongoDB Atlas nodes
      const clusterName = host.split('.')[0]; // e.g., "cluster0" from "cluster0.aqbmxvz.mongodb.net"
      const domain = host.split('.').slice(1).join('.'); // e.g., "aqbmxvz.mongodb.net"
      
      // Add direct connection URLs to bypass SRV lookup
      for (let i = 0; i < 3; i++) {
        connectionMethods.push({
          name: `Direct shard connection ${i}`,
          uri: `mongodb://${username}:${password}@${clusterName}-shard-00-0${i}.${domain}:27017/?ssl=true&authSource=admin&replicaSet=${clusterName}`,
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            ssl: true,
            replicaSet: clusterName,
            authSource: 'admin'
          }
        });
      }
      
      console.log(`Added ${connectionMethods.length - 1} direct connection methods as fallbacks`);
    }
  }
  
  // Method 3: Local development fallback
  if (isDev) {
    connectionMethods.push({
      name: 'Local development database',
      uri: 'mongodb://localhost:27017/daily-app',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000 // 5 seconds
      }
    });
  }
  
  // Try each connection method
  let connected = false;
  
  for (const [index, method] of connectionMethods.entries()) {
    console.log(`\n⏳ Trying connection method ${index + 1}/${connectionMethods.length}: ${method.name}`);
    
    // Try up to MAX_RETRIES for primary URI, only once for fallbacks
    const attempts = index === 0 ? MAX_RETRIES : 1;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (attempt > 1) {
        console.log(`Re-attempting connection (${attempt}/${attempts})...`);
      }
      
      try {
        const conn = await mongoose.connect(method.uri, method.options);
        console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
        
        if (index > 0) {
          console.log(`Note: Using fallback connection method (${method.name}) instead of primary.`);
          if (index === connectionMethods.length - 1 && isDev) {
            console.log('\n⚠️ Using local development database. Data will not persist to production.\n');
          }
        }
        
        connected = true;
        return true;
      } catch (err) {
        console.error(`❌ Connection attempt failed: ${err.message}`);
        
        if (attempt < attempts) {
          console.log(`Waiting ${RETRY_DELAY/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
  }
  
  // If we reach here, all connection methods failed
  console.error('\n❌ All MongoDB connection methods failed.');
  console.error('The application will run with limited functionality.\n');
  
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