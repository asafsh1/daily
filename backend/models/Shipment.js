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
    // Legs array field - changed to ensure it's always initialized
    legs: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'shipmentLeg'
      }],
      default: []
    }
  },
  {
    timestamps: true
  }
);

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