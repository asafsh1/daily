const mongoose = require('mongoose');

const ShipmentLegSchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'shipment',
    required: true
  },
  legOrder: {
    type: Number,
    default: 0
  },
  legId: {
    type: String,
    required: false
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  carrier: {
    type: String,
    required: false
  },
  departureDate: {
    type: Date,
    required: false
  },
  arrivalDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'in-transit', 'delayed', 'completed', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: {
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
ShipmentLegSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('shipmentLeg', ShipmentLegSchema); 