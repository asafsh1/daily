const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');
const Customer = require('../../models/Customer');
const mongoose = require('mongoose');

// @route   GET api/dashboard/summary
// @desc    Get dashboard summary statistics
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    console.log('Processing dashboard summary request');
    
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      // Return empty data with same structure to avoid frontend errors
      return res.json({
        totalShipments: 0,
        recentShipments: [],
        shipmentsByStatus: {
          'Pending': 0,
          'In Transit': 0,
          'Arrived': 0,
          'Delayed': 0,
          'Canceled': 0
        },
        totalNonInvoiced: 0,
        shipmentsByCustomer: []
      });
    }
    
    // Get total shipments count
    const totalShipments = await Shipment.countDocuments();
    
    // Get recent shipments with customer data
    const recentShipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .populate('customer', 'name')
      .populate({
        path: 'legs',
        options: { sort: { legOrder: 1 } },
        select: 'awbNumber departureTime arrivalTime origin destination'
      })
      .lean();
    
    // Get shipments by status
    const shipmentStatusCounts = await Shipment.aggregate([
      { $group: { _id: '$shipmentStatus', count: { $sum: 1 } } }
    ]);
    
    const shipmentsByStatus = {};
    shipmentStatusCounts.forEach(status => {
      shipmentsByStatus[status._id] = status.count;
    });
    
    // Get non-invoiced shipments count
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get shipments by customer
    const shipmentsByCustomer = await Shipment.aggregate([
      { $group: { _id: '$customer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get customer names
    const customerIds = shipmentsByCustomer.map(item => item._id);
    const customers = await Customer.find({ _id: { $in: customerIds } }).select('name');
    
    const customerMap = {};
    customers.forEach(customer => {
      customerMap[customer._id] = customer.name;
    });
    
    const formattedShipmentsByCustomer = shipmentsByCustomer.map(item => ({
      customer: customerMap[item._id] || 'Unknown',
      count: item.count
    }));
    
    const response = {
      totalShipments,
      recentShipments,
      shipmentsByStatus,
      totalNonInvoiced,
      shipmentsByCustomer: formattedShipmentsByCustomer
    };
    
    console.log('Dashboard summary prepared:', {
      totalShipments,
      recentShipmentsCount: recentShipments.length,
      statusCounts: shipmentsByStatus,
      nonInvoicedCount: totalNonInvoiced
    });
    
    res.json(response);
  } catch (err) {
    console.error('Dashboard summary error:', err.message);
    
    // Return empty data with same structure instead of error
    res.json({
      totalShipments: 0,
      recentShipments: [],
      shipmentsByStatus: {
        'Pending': 0,
        'In Transit': 0,
        'Arrived': 0,
        'Delayed': 0,
        'Canceled': 0
      },
      totalNonInvoiced: 0,
      shipmentsByCustomer: []
    });
  }
});

// @route   GET api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    // Get total shipments
    const totalShipments = await Shipment.countDocuments();
    
    // Get shipments by status
    const pendingShipments = await Shipment.countDocuments({ shipmentStatus: 'Pending' });
    const arrivedShipments = await Shipment.countDocuments({ shipmentStatus: 'Arrived' });
    const delayedShipments = await Shipment.countDocuments({ shipmentStatus: 'Delayed' });
    const canceledShipments = await Shipment.countDocuments({ shipmentStatus: 'Canceled' });
    
    // Get invoiced vs non-invoiced
    const invoicedShipments = await Shipment.countDocuments({ invoiced: true });
    const nonInvoicedShipments = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments
    const recentShipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5);
    
    res.json({
      totalShipments,
      shipmentsByStatus: {
        pending: pendingShipments,
        arrived: arrivedShipments,
        delayed: delayedShipments,
        canceled: canceledShipments
      },
      invoiceStats: {
        invoiced: invoicedShipments,
        nonInvoiced: nonInvoicedShipments
      },
      recentShipments
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/monthly-stats
// @desc    Get monthly statistics
// @access  Public
router.get('/monthly-stats', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Use aggregation to get monthly counts in a single query
    const monthlyStats = await Shipment.aggregate([
      {
        $match: {
          dateAdded: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$dateAdded" } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          count: 1
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);
    
    // Fill in missing months with zero counts
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0
    }));
    
    // Update with actual data
    monthlyStats.forEach(stat => {
      monthlyData[stat.month - 1].count = stat.count;
    });
    
    res.json(monthlyData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments with passed arrival dates that aren't invoiced
// @access  Public
router.get('/overdue-non-invoiced', async (req, res) => {
  try {
    const currentDate = new Date();
    
    // Find shipments where:
    // 1. Scheduled arrival date has passed
    // 2. Either not invoiced or invoice not sent
    const overdueShipments = await Shipment.find({
      scheduledArrival: { $lt: currentDate },
      $or: [
        { invoiced: false },
        { invoiceSent: false }
      ]
    }).sort({ scheduledArrival: 1 });
    
    res.json(overdueShipments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 