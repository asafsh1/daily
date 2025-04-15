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
      default: 'N/A'
    },
    shipperName: {
      type: String,
      default: '',
      trim: true
    },
    consigneeName: {
      type: String,
      default: '',
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
    // Change carrier to airline
    airline: {
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
    // Reference to legs in the shipmentLeg collection
    legs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shipmentLeg'
    }],
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
    
    // Generate a consistent sequential ID (format: SHIPMENT + 3-digit number)
    
    // Find the highest serial number with our format
    const latestShipment = await this.constructor
      .findOne(
        { serialNumber: /^SHIPMENT\d{3}$/ }, // Match SHIPMENTxxx format
        { serialNumber: 1 }
      )
      .sort({ serialNumber: -1 }); // Get the highest one
    
    let nextNumber = 1;
    if (latestShipment && latestShipment.serialNumber) {
      console.log('Found existing highest serial number:', latestShipment.serialNumber);
      
      // Extract the numeric part
      const numberPart = latestShipment.serialNumber.replace('SHIPMENT', '');
      if (numberPart && !isNaN(numberPart)) {
        nextNumber = parseInt(numberPart, 10) + 1;
      }
    }
    
    // Format with leading zeros (e.g., SHIPMENT001)
    this.serialNumber = `SHIPMENT${nextNumber.toString().padStart(3, '0')}`;
    console.log('Generated new serial number:', this.serialNumber);
    
    next();
  } catch (err) {
    console.error('Error in serial number generation:', err);
    next(err);
  }
});

// Backwards compatibility for carrier field (map to airline)
ShipmentSchema.virtual('carrier').get(function() {
  return this.airline;
});

ShipmentSchema.virtual('carrier').set(function(value) {
  this.airline = value;
});

// Set toJSON and toObject options to include virtuals
ShipmentSchema.set('toJSON', { virtuals: true });
ShipmentSchema.set('toObject', { virtuals: true });

// Add middleware to auto-populate legs when getting a shipment
ShipmentSchema.pre('findOne', function() {
  this.populate('legs');
});

ShipmentSchema.pre('find', function() {
  this.populate('legs');
});

module.exports = mongoose.model('shipment', ShipmentSchema); 