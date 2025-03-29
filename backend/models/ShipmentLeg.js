const mongoose = require('mongoose');

const ShipmentLegSchema = new mongoose.Schema({
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'shipment',
    required: true
  },
  legOrder: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  flightNumber: {
    type: String,
    required: true
  },
  mawbNumber: {
    type: String,
    required: true
  },
  awbNumber: {
    type: String
  },
  departureTime: {
    type: Date,
    required: true
  },
  arrivalTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Transit', 'Arrived', 'Delayed', 'Canceled'],
    default: 'Pending'
  },
  notes: {
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

// Create a compound index for shipmentId and legOrder to ensure uniqueness
ShipmentLegSchema.index({ shipmentId: 1, legOrder: 1 }, { unique: true });

module.exports = mongoose.model('shipmentLeg', ShipmentLegSchema); 