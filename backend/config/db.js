const mongoose = require('mongoose');
const config = require('config');

// Get the MongoDB URI from config
let mongoURI;
try {
  mongoURI = config.get('mongoURI');
  console.log('Using MongoDB URI from config file');
} catch (err) {
  console.error('Error loading MongoDB URI from config:', err.message);
  // Use default URI if not found in config
  mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/daily-app';
  console.log('Using fallback MongoDB URI');
}

// Connect to MongoDB with retries
const connectDB = async () => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`MongoDB connection attempt ${attempt} of ${MAX_RETRIES}...`);
    
    try {
      // Log detailed connection information
      console.log(`Connecting to: ${mongoURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`); // Hide password in logs
      
      // Set more verbose connection options
      const conn = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 seconds
        connectTimeoutMS: 10000, // 10 seconds
      });
      
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (err) {
      mongoose.connection.close();
      console.error('Mongoose disconnected from MongoDB');
      
      // Provide more detailed error information
      console.error(`Connection attempt ${attempt} failed: ${err.message}`);
      if (err.name === 'MongoServerSelectionError') {
        console.error(`Server selection timed out. Check your network or MongoDB Atlas status.`);
      } else if (err.message.includes('ENOTFOUND')) {
        console.error(`DNS resolution failed. Check your MongoDB URI and internet connection.`);
      } else if (err.message.includes('Authentication failed')) {
        console.error(`Authentication failed. Check your MongoDB username and password.`);
      }
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts.`);
        console.error(`Last error: ${err.message}`);
        return false;
      }
    }
  }
  
  return false;
};

// Handle errors after initial connection
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