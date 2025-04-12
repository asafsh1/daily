const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    unique: true
  },
  contactName: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  awbInstructions: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add middleware to update timestamps
CustomerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('customer', CustomerSchema); 