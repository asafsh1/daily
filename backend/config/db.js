const mongoose = require('mongoose');
const config = require('config');

// Function to get MongoDB connection string
const getMongoURI = () => {
  // Try environment variable first
  if (process.env.MONGO_URI) {
    console.log('Using MongoDB URI from environment variable');
    return process.env.MONGO_URI;
  }
  
  // Then try config file
  try {
    const uri = config.get('mongoURI');
    console.log('Using MongoDB URI from config file');
    return uri;
  } catch (err) {
    console.error('Error loading MongoDB URI from config:', err.message);
  }
  
  // Fallback to localhost
  console.log('Using fallback localhost MongoDB URI');
  return 'mongodb://localhost:27017/daily-app';
};

// Connect to MongoDB with multiple fallback options
const connectDB = async () => {
  // Maximum retry attempts for the primary connection
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 3000; // 3 seconds between retries
  
  // Get connection details from the config
  const primaryURI = getMongoURI();
  
  // Hide password in logs
  const redactedURI = primaryURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`Attempting to connect to MongoDB: ${redactedURI}`);
  
  // Extract credentials and other info from the connection string
  let username, password, clusterInfo;
  
  try {
    // Parse MongoDB URI to extract credentials
    if (primaryURI.includes('@')) {
      const authPart = primaryURI.split('@')[0].split('//')[1];
      [username, password] = authPart.split(':');
      clusterInfo = primaryURI.split('@')[1].split('/')[0];
      console.log(`Extracted cluster info: ${clusterInfo}`);
    }
  } catch (err) {
    console.error('Error parsing MongoDB URI:', err.message);
  }
  
  // Define alternative connection methods
  const connectionOptions = [];
  
  // 1. First try: Original connection string as provided
  connectionOptions.push({
    name: 'Primary connection string',
    uri: primaryURI,
    options: { 
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    }
  });
  
  // 2. Second try: If it's MongoDB Atlas, try with IP addresses instead of DNS
  if (primaryURI.includes('mongodb+srv://') && username && password) {
    // These are common MongoDB Atlas IP addresses that often work
    // We'll try multiple IP patterns since exact IPs can vary
    const possibleIPs = [
      '3.135.180.66',
      '3.98.158.158',
      '3.89.213.205',
      '54.208.102.92',
      '52.49.250.208',
      '3.144.220.31'
    ];
    
    // Add connections to each possible IP
    possibleIPs.forEach((ip, index) => {
      connectionOptions.push({
        name: `Atlas IP connection ${index + 1}`,
        uri: `mongodb://${username}:${password}@${ip}:27017/?authSource=admin&retryWrites=true&ssl=true`,
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
          ssl: true,
          authSource: 'admin'
        }
      });
    });
    
    console.log(`Added ${possibleIPs.length} direct IP connection options`);
  }
  
  // 3. Last resort: Connect to localhost
  connectionOptions.push({
    name: 'Local MongoDB instance',
    uri: 'mongodb://localhost:27017/daily-app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  });
  
  // 4. In-memory MongoDB for testing (added as last option)
  connectionOptions.push({
    name: 'Mock in-memory database',
    uri: 'mongodb://127.0.0.1:27017/daily-app-mock',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  });
  
  console.log(`Prepared ${connectionOptions.length} connection methods`);
  
  // Try each connection method in sequence
  for (let i = 0; i < connectionOptions.length; i++) {
    const connection = connectionOptions[i];
    const isBackup = i > 0;
    
    console.log(`\nTrying connection method ${i+1}/${connectionOptions.length}: ${connection.name}`);
    
    // How many attempts for this method (only retry primary connection)
    const attempts = isBackup ? 1 : MAX_RETRIES;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt}/${attempts}...`);
        }
        
        // Set a shorter timeout for backup connections
        const options = {...connection.options};
        if (isBackup) {
          options.serverSelectionTimeoutMS = 3000;
          options.connectTimeoutMS = 5000;
        }
        
        // Attempt connection
        const conn = await mongoose.connect(connection.uri, options);
        
        // Successfully connected
        console.log(`\n✅ Connected to MongoDB via ${connection.name} (${conn.connection.host})`);
        
        // Warning for non-primary connections
        if (isBackup) {
          if (i === connectionOptions.length - 1) {
            console.warn('\n⚠️ WARNING: Using mock database! No data will persist.');
          } else if (i === connectionOptions.length - 2) {
            console.warn('\n⚠️ WARNING: Connected to local database. Data will not be synchronized with production.');
          } else {
            console.warn(`\n⚠️ WARNING: Connected via backup method ${i+1}/${connectionOptions.length}.`);
          }
        }
        
        return true;
      } catch (err) {
        // Log connection failure
        console.error(`Connection failed (${connection.name}): ${err.message}`);
        
        // Wait before retry if this isn't the last attempt
        if (attempt < attempts) {
          console.log(`Waiting ${RETRY_DELAY/1000} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
  }
  
  // If we get here, all connection attempts failed
  console.error('\n❌ ERROR: All MongoDB connection methods failed');
  
  // Return false but don't crash the server - we'll run in limited functionality mode
  return false;
};

// Handle connection events
mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to application termination');
  }
  process.exit(0);
});

module.exports = connectDB; 