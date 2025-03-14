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

const connectDB = async () => {
  try {
    console.log('Attempting MongoDB connection...');
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected Successfully');
    return true;
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    console.log('MongoDB connection failed, but server will continue to run with limited functionality.');
    return false;
  }
};

module.exports = connectDB; 