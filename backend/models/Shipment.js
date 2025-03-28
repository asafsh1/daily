const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
  dateAdded: {
    type: Date,
    required: true
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['done', 'confirmed', 'planned', 'canceled']
  },
  customer: {
    type: String,
    required: true
  },
  awbNumber1: {
    type: String,
    required: true
  },
  awbNumber2: {
    type: String
  },
  routing: {
    type: String,
    required: true
  },
  flightNumber: {
    type: String,
    required: true
  },
  scheduledDeparture: {
    type: Date,
    required: true
  },
  scheduledArrival: {
    type: Date,
    required: true
  },
  shipmentStatus: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'Arrived', 'Delayed', 'Canceled', 'In Transit']
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
    type: Number
  },
  receivables: {
    type: String
  },
  comments: {
    type: String
  },
  invoiceNumber: {
    type: String
  },
  invoiceStatus: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Paid']
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('shipment', ShipmentSchema); 