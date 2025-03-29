const mongoose = require('mongoose');
const config = require('config');

// First try environment variable, then fall back to config
let db;
try {
  // Try to get from environment variable first
  if (process.env.MONGODB_URI) {
    db = process.env.MONGODB_URI;
    console.log('Using MongoDB URI from environment variable');
  } else {
    // Fall back to config
    db = config.get('mongoURI');
    console.log('Using MongoDB URI from config file');
  }
} catch (err) {
  console.error('Error getting MongoDB URI:', err.message);
  process.exit(1);
}

// Connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 10000, // 10 seconds
};

// Implement a retry mechanism
const connectWithRetry = async (retries = 5, delay = 5000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`MongoDB connection attempt ${i + 1} of ${retries}...`);
      await mongoose.connect(db, mongooseOptions);
      console.log('MongoDB Connected Successfully');
      return true;
    } catch (err) {
      lastError = err;
      console.error(`Connection attempt ${i + 1} failed:`, err.message);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`Failed to connect to MongoDB after ${retries} attempts.`);
  console.error('Last error:', lastError.message);
  return false;
};

// Monitor connection
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

// Export the connection function
const connectDB = async () => {
  const connected = await connectWithRetry();
  return connected;
};

module.exports = connectDB; 