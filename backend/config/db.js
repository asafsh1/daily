const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the connection string from environment variables or config
    const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');
    
    if (!mongoURI) {
      console.error('MongoDB URI is not defined in environment variables or config');
      process.exit(1);
    }
    
    // Remove credential details from log
    const redactedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Connection URI: ${redactedURI}`);
    
    // Set global mongoose options for better stability
    mongoose.set('strictQuery', false);
    
    // Configure connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 10,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      autoIndex: true,
      family: 4
    };

    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(mongoURI, options);
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
    return true;
    
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Database connection successful - all functionality available');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Database disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Database connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB; 