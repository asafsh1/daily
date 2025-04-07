const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the connection string from config
    const mongoURI = config.get('mongoURI');
    const redactedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Connection URI: ${redactedURI}`);
    
    // Try connecting with standard options
    console.log('Using standard connection approach');
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`MongoDB Atlas connection error: ${err.message}`);
    
    // If original connection fails, try local database
    try {
      console.log('⚠️ Attempting to connect to local MongoDB instance...');
      const conn = await mongoose.connect('mongodb://localhost:27017/shipment-tracker', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log(`⚠️ WARNING: Connected to local database (${conn.connection.host}). Data will not be synchronized with production.`);
      console.log('⚠️ If you want to use your production data, ensure MongoDB Atlas credentials are correct.');
      return true;
    } catch (localErr) {
      console.error(`Local database connection failed: ${localErr.message}`);
      console.error('❌ All database connection attempts failed.');
      process.exit(1);
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB; 