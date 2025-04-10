const mongoose = require('mongoose');
const config = require('config');
const dns = require('dns');
const { promisify } = require('util');

// Promisify DNS functions
const dnsResolve = promisify(dns.resolve);

// Set multiple DNS servers for better resolution
dns.setServers([
  '8.8.8.8',    // Google DNS
  '8.8.4.4',    // Google DNS backup
  '1.1.1.1',    // Cloudflare DNS
  '1.0.0.1'     // Cloudflare DNS backup
]);

// Function to validate MongoDB URI format
const validateMongoURI = (uri) => {
  if (!uri) return false;
  const regex = /^mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/]+\/[^?]+(\?.*)?$/;
  return regex.test(uri);
};

// Function to test DNS resolution
const testDNSResolution = async (host) => {
  try {
    const addresses = await dnsResolve(host);
    console.log(`✅ DNS resolution successful for ${host}:`, addresses);
    return true;
  } catch (error) {
    console.error(`❌ DNS resolution failed for ${host}:`, error.message);
    return false;
  }
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Get MongoDB URI from config or environment variable
    const mongoURI = process.env.MONGODB_URI || config.get('mongoURI');
    
    // Log sanitized URI (hide credentials)
    const sanitizedURI = mongoURI.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, '$1$2:****@');
    console.log('Using MongoDB URI:', sanitizedURI);

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      ssl: true,
      authSource: 'admin',
      maxPoolSize: 50,
      minPoolSize: 10
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Add connection event handlers
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    
    if (err.name === 'MongooseServerSelectionError') {
      console.error('Could not connect to MongoDB servers.');
      console.error('Please check:');
      console.error('1. Network connectivity');
      console.error('2. MongoDB Atlas status');
      console.error('3. IP whitelist settings');
      console.error('4. Database user credentials');
      console.error('5. SSL certificate validation');
    }

    // In production, don't exit the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Running in production mode without database connection');
      return null;
    }

    process.exit(1);
  }
};

// Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Database connection established');
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