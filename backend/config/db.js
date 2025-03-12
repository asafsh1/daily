const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected...');
    return true;
  } catch (err) {
    console.error(err.message);
    console.log('MongoDB connection failed, but server will continue to run with limited functionality.');
    return false;
  }
};

module.exports = connectDB; 