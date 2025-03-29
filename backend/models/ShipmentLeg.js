const mongoose = require('mongoose');

const ShipmentLegSchema = new mongoose.Schema({
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'shipment',
    required: true,
    index: true
  },
  legOrder: {
    type: Number,
    required: true,
    min: 1,
    max: 20
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

// Pre-save hook to ensure the leg has a valid legOrder
ShipmentLegSchema.pre('save', async function(next) {
  if (!this.isNew && !this.isModified('legOrder')) {
    return next();
  }
  
  try {
    // If legOrder is not set or is 0, auto-assign the next available number
    if (!this.legOrder || this.legOrder === 0) {
      const highestLeg = await this.constructor.findOne(
        { shipmentId: this.shipmentId },
        { legOrder: 1 },
        { sort: { legOrder: -1 } }
      );
      
      this.legOrder = highestLeg ? highestLeg.legOrder + 1 : 1;
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('shipmentLeg', ShipmentLegSchema); 