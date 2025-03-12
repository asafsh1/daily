const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('config');
const User = require('../models/User');

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Try to connect to MongoDB
const connectDB = async () => {
  try {
    // Try to use config
    const mongoURI = config.get('mongoURI');
    await mongoose.connect(mongoURI, mongoOptions);
    console.log('MongoDB Connected using config URI');
    return true;
  } catch (configErr) {
    console.log('Could not connect using config, trying localhost...');
    
    try {
      // Fallback to localhost
      await mongoose.connect('mongodb://localhost:27017/shipment-reporting', mongoOptions);
      console.log('MongoDB Connected to localhost');
      return true;
    } catch (localErr) {
      console.error('MongoDB Connection Error:', localErr.message);
      return false;
    }
  }
};

const createAdminUser = async () => {
  // Connect to database
  const connected = await connectDB();
  if (!connected) {
    console.error('Failed to connect to MongoDB. Make sure MongoDB is running.');
    process.exit(1);
  }
  
  try {
    // Check if admin already exists
    const adminEmail = 'admin@shipment.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const adminUser = new User({
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@shipment.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err.message);
    process.exit(1);
  }
};

createAdminUser(); 