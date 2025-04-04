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
  
  // Try the primary connection
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`MongoDB connection attempt ${attempt} of ${MAX_RETRIES} to primary URI...`);
    
    try {
      const conn = await mongoose.connect(primaryURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 seconds
        connectTimeoutMS: 10000, // 10 seconds
      });
      
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (err) {
      console.error(`Connection attempt ${attempt} failed:`, err.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error(`Failed to connect to primary MongoDB after ${MAX_RETRIES} attempts.`);
        console.log('Trying localhost fallback...');
        
        // Try localhost as fallback
        try {
          const conn = await mongoose.connect('mongodb://localhost:27017/daily-app', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 seconds
          });
          
          console.log(`Connected to local MongoDB: ${conn.connection.host}`);
          return true;
        } catch (localErr) {
          console.error('Failed to connect to local MongoDB:', localErr.message);
          
          // Final fallback - operate in limited functionality mode
          console.error('All MongoDB connection attempts failed. Running with limited functionality.');
          return false;
        }
      }
    }
  }
  
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