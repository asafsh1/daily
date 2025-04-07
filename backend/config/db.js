const mongoose = require('mongoose');
const config = require('config');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    // Get the original URI from config
    const mongoURI = config.get('mongoURI');
    
    // Log connection URI without exposing credentials
    const redactedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Connection URI: ${redactedURI}`);
    
    // Try direct connection with MongoDB Atlas cluster
    console.log('Using standard connection approach');
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 20000
    });
    
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`MongoDB Atlas connection error: ${err.message}`);
    
    try {
      console.log('⚠️ Attempting to connect using modified URI format...');
      
      // Get the URI components
      const mongoURI = config.get('mongoURI');
      const [prefix, rest] = mongoURI.split('@');
      const auth = prefix.replace('mongodb+srv://', '');
      const [host, options] = rest.split('?');
      const clusterHost = host.split('/')[0];
      
      // Create a MongoDB standard URI with hardcoded known Atlas hosts
      // Use known regions with fixed IP format (different regions for failover)
      const knownHosts = [
        `cluster0-shard-00-00.${clusterHost.split('.')[1]}.mongodb.net:27017`,
        `cluster0-shard-00-01.${clusterHost.split('.')[1]}.mongodb.net:27017`,
        `cluster0-shard-00-02.${clusterHost.split('.')[1]}.mongodb.net:27017`
      ];
      
      // Create a direct connection string using replica set format
      const directConnURI = `mongodb://${auth}@${knownHosts.join(',')}/${clusterHost.split('.')[0]}?ssl=true&replicaSet=atlas-${clusterHost.split('.')[1].charAt(0)}${clusterHost.split('.')[1].charAt(1)}&authSource=admin`;
      
      // Try connecting with direct connection URI
      console.log(`Using direct connection URI (redacted): mongodb://***:***@${knownHosts.join(',')}/...`);
      const conn = await mongoose.connect(directConnURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 20000
      });
      
      console.log(`✅ Connected to MongoDB Atlas via direct URI: ${conn.connection.host}`);
      return true;
    } catch (directError) {
      console.error(`Direct connection error: ${directError.message}`);
      
      try {
        // Last attempt - try to connect using a standard URI without SRV
        console.log('Making final connection attempt with standard URI...');
        
        const mongoURI = config.get('mongoURI');
        const standardURI = mongoURI
          .replace('mongodb+srv://', 'mongodb://')
          .replace('?', '/?retryWrites=true&ssl=true&');
          
        const conn = await mongoose.connect(standardURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
          ssl: true
        });
        
        console.log(`✅ Connected to MongoDB using standard URI: ${conn.connection.host}`);
        return true;
      } catch (finalError) {
        console.error(`Final connection attempt failed: ${finalError.message}`);
      }
    }
    
    // If all MongoDB Atlas connection attempts failed, try connecting to local MongoDB
    try {
      console.log('⚠️ All MongoDB Atlas connection attempts failed. Trying local database...');
      
      await mongoose.connect('mongodb://localhost:27017/shipment-tracker', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('⚠️ WARNING: Connected to local database. Data will not be synchronized with production.');
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