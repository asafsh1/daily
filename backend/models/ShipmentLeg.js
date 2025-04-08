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
    enum: ['Pending', 'Planned', 'In Transit', 'Departed', 'Arrived', 'Completed', 'Delayed', 'Cancelled'],
    default: 'Pending'
  },
  trackingNumber: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    required: false
  },
  origin: {
    type: String,
    required: false
  },
  destination: {
    type: String,
    required: false
  },
  flightNumber: {
    type: String,
    required: false
  },
  mawbNumber: {
    type: String,
    required: false
  },
  departureTime: {
    type: Date,
    required: false
  },
  arrivalTime: {
    type: Date,
    required: false
  },
  statusHistory: [{
    status: String,
    timestamp: Date
  }],
  changeLog: {
    type: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      user: {
        type: String,
        default: 'System'
      },
      action: {
        type: String
      },
      details: {
        type: String
      },
      fields: {
        type: Object
      }
    }],
    default: []
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

// Update the updatedAt field and ensure field consistency before saving
ShipmentLegSchema.pre('save', async function(next) {
  try {
    this.updatedAt = Date.now();
    
    // Synchronize field aliases
    if (this.from && !this.origin) {
      this.origin = this.from;
    }
    if (this.origin && !this.from) {
      this.from = this.origin;
    }
    
    if (this.to && !this.destination) {
      this.destination = this.to;
    }
    if (this.destination && !this.to) {
      this.to = this.destination;
    }
    
    if (this.departureDate && !this.departureTime) {
      this.departureTime = this.departureDate;
    }
    if (this.departureTime && !this.departureDate) {
      this.departureDate = this.departureTime;
    }
    
    if (this.arrivalDate && !this.arrivalTime) {
      this.arrivalTime = this.arrivalDate;
    }
    if (this.arrivalTime && !this.arrivalDate) {
      this.arrivalDate = this.arrivalTime;
    }
    
    if (this.trackingNumber && !this.mawbNumber) {
      this.mawbNumber = this.trackingNumber;
    }
    if (this.mawbNumber && !this.trackingNumber) {
      this.trackingNumber = this.mawbNumber;
    }
    
    // Generate a consistent legId if it doesn't exist (LEG001, LEG002, etc.)
    if (!this.legId) {
      this.legId = `LEG${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;
    }
    
    next();
  } catch (error) {
    console.error('Error in ShipmentLeg pre-save hook:', error);
    next(error);
  }
});

module.exports = ShipmentLeg = mongoose.model('shipmentLeg', ShipmentLegSchema); 