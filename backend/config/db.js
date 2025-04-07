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
  return 'mongodb://localhost:27017/shipment-tracker';
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
  
  // Attempt the primary connection with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
      }
      
      // Attempt connection
      const conn = await mongoose.connect(primaryURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000
      });
      
      // Successfully connected
      console.log(`\n✅ Connected to MongoDB (${conn.connection.host})`);
      return true;
    } catch (err) {
      // Log connection failure
      console.error(`Connection failed: ${err.message}`);
      
      // Wait before retry if this isn't the last attempt
      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY/1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  // If we get here, primary connection failed - try localhost
  console.log('\n⚠️ Primary connection failed. Attempting local database connection...');
  
  try {
    await mongoose.connect('mongodb://localhost:27017/shipment-tracker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('\n⚠️ WARNING: Connected to local database. Data will not be synchronized with production.');
    
    // Create warning marker file
    const fs = require('fs');
    fs.writeFileSync('LOCAL_DB_WARNING.txt', 
      'WARNING: Application is running with local database.\n' +
      'Data will not be synchronized with production and will be lost when the server restarts.\n' +
      'To fix this issue, update the MongoDB connection string in config/default.json\n' +
      'You can create a free MongoDB Atlas cluster at https://www.mongodb.com/atlas/database'
    );
    
    return true;
  } catch (localErr) {
    console.error(`Local MongoDB connection error: ${localErr.message}`);
    
    // All connection attempts have failed
    console.error('\n❌ ERROR: All MongoDB connection methods failed');
    
    if (process.env.NODE_ENV === 'production') {
      // In production, fail hard
      process.exit(1);
    } else {
      // In development, create an error marker file
      const fs = require('fs');
      fs.writeFileSync('DB_CONNECTION_ERROR.txt', 
        'ERROR: Application failed to connect to any MongoDB instance.\n' +
        'The server is running in LIMITED MODE with NO DATABASE access.\n' +
        'To fix this issue:\n' +
        '1. Check that MongoDB is installed and running locally, or\n' +
        '2. Update the MongoDB connection string in config/default.json, or\n' +
        '3. Create a free MongoDB Atlas cluster at https://www.mongodb.com/atlas/database'
      );
      
      console.log('\n⚠️ WARNING: Running with NO DATABASE access. Extremely limited functionality!');
      return false;
    }
  }
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