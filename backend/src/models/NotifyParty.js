const mongoose = require('mongoose');

const NotifyPartySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  notifyPartyId: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: false
  },
  contact: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    required: false
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

// Update the updatedAt field before saving
NotifyPartySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('notifyParty', NotifyPartySchema); 