const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShipmentSchema = new Schema(
  {
    serialNumber: {
      type: String,
      unique: true
    },
    dateAdded: {
      type: Date,
      required: true,
      default: Date.now
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['planned', 'confirmed', 'done', 'canceled'],
      default: 'planned'
    },
    customer: {
      type: Schema.Types.Mixed, // Changed to Mixed to handle both ObjectId and string
      ref: 'customer',
      required: true
    },
    shipperName: {
      type: String,
      required: true,
      trim: true
    },
    consigneeName: {
      type: String,
      required: true,
      trim: true
    },
    notifyParty: {
      type: String,
      trim: true
    },
    // AWB numbers and routing will be determined from legs
    shipmentStatus: {
      type: String,
      default: 'Pending'
    },
    weight: {
      type: Number
    },
    packageCount: {
      type: Number
    },
    // Add new dimension fields
    length: {
      type: Number
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    volumetricWeight: {
      type: Number
    },
    chargeableWeight: {
      type: Number
    },
    fileNumber: {
      type: String
    },
    fileCreatedDate: {
      type: Date
    },
    invoiced: {
      type: Boolean,
      default: false
    },
    invoiceSent: {
      type: Boolean,
      default: false
    },
    cost: {
      type: Number,
      default: 0
    },
    receivables: {
      type: Number,
      default: 0
    },
    invoiceNumber: {
      type: String
    },
    invoiceStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Paid'],
      default: 'Pending'
    },
    comments: {
      type: String
    },
    createdBy: {
      type: String
    },
    updatedBy: {
      type: String
    },
    // References to entity IDs
    shipper: {
      type: Schema.Types.ObjectId,
      ref: 'shipper'
    },
    consignee: {
      type: Schema.Types.ObjectId,
      ref: 'consignee'
    },
    notifyPartyId: {
      type: Schema.Types.ObjectId,
      ref: 'notifyParty'
    },
    // Legs array field - changed to ensure it's always initialized
    legs: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'shipmentLeg'
      }],
      default: []
    },
    // Add changelog to track history
    changeLog: {
      type: [{
        timestamp: {
          type: Date,
          default: Date.now
        },
        user: {
          type: String
        },
        action: {
          type: String
        },
        details: {
          type: String
        }
      }],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to auto-generate serial numbers
ShipmentSchema.pre('save', async function(next) {
  try {
    console.log('Running pre-save hook for serial number generation');
    // Only generate serial number if it doesn't already exist
    if (this.serialNumber) {
      console.log('Shipment already has serial number:', this.serialNumber);
      return next();
    }
    
    console.log('Generating new serial number for shipment');
    
    // Generate serial number (format: SHP-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    
    // Find the highest serial number for this year
    const latestShipment = await this.constructor.findOne(
      { serialNumber: new RegExp(`SHP-${currentYear}-\\d+`) },
      { serialNumber: 1 }
    ).sort({ serialNumber: -1 });
    
    let nextNumber = 1;
    if (latestShipment && latestShipment.serialNumber) {
      console.log('Found existing highest serial number:', latestShipment.serialNumber);
      const parts = latestShipment.serialNumber.split('-');
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2], 10) + 1;
      }
    }
    
    // Format with leading zeros (e.g., SHP-2023-0001)
    this.serialNumber = `SHP-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    console.log('Generated new serial number:', this.serialNumber);
    
    next();
  } catch (err) {
    console.error('Error generating serial number:', err);
    next(err);
  }
});

// Add a virtual property to get routing from legs
ShipmentSchema.virtual('routing').get(function() {
  if (!this.legs || this.legs.length === 0) {
    return 'No routing';
  }
  
  // Map legs to their origin/destination and join with hyphens
  const routePoints = [];
  this.legs.forEach((leg, index) => {
    if (index === 0) {
      routePoints.push(leg.origin);
    }
    routePoints.push(leg.destination);
  });
  
  return routePoints.join('-');
});

// Set toJSON and toObject options to include virtuals
ShipmentSchema.set('toJSON', { virtuals: true });
ShipmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('shipment', ShipmentSchema); 