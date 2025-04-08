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
      // Find the highest legId with our format
      const latestLeg = await this.constructor
        .findOne(
          { legId: /^LEG\d{3}$/ }, // Match LEGxxx format
          { legId: 1 }
        )
        .sort({ legId: -1 }); // Get the highest one
      
      let nextNumber = 1;
      if (latestLeg && latestLeg.legId) {
        console.log('Found existing highest legId:', latestLeg.legId);
        
        // Extract the numeric part
        const numberPart = latestLeg.legId.replace('LEG', '');
        if (numberPart && !isNaN(numberPart)) {
          nextNumber = parseInt(numberPart, 10) + 1;
        }
      }
      
      // Format with leading zeros (e.g., LEG001)
      this.legId = `LEG${nextNumber.toString().padStart(3, '0')}`;
      console.log('Generated new legId:', this.legId);
    }
    
    next();
  } catch (err) {
    console.error('Error in ShipmentLeg pre-save hook:', err);
    next(err);
  }
});

module.exports = mongoose.model('shipmentLeg', ShipmentLegSchema); 