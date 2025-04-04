const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');
const Customer = require('../../models/Customer');
const mongoose = require('mongoose');
const User = require('../../models/User');

// @route   GET api/dashboard/diagnostics
// @desc    Check database connection and API health
// @access  Public
router.get('/diagnostics', async (req, res) => {
  try {
    console.log('Running API diagnostics');
    
    // Check database connection
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      dbName: mongoose.connection.name
    };
    
    console.log('Database status:', dbStatus);
    
    // Try a simple DB query
    let dbQueryResult = 'Failed';
    try {
      const count = await Shipment.estimatedDocumentCount();
      dbQueryResult = `Success: Found ${count} shipments`;
    } catch (dbErr) {
      dbQueryResult = `Error: ${dbErr.message}`;
    }
    
    console.log('DB query test:', dbQueryResult);
    
    // Return diagnostic info
    res.json({
      timestamp: new Date().toISOString(),
      database: dbStatus,
      dbQuery: dbQueryResult,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        port: process.env.PORT || 'not set'
      }
    });
  } catch (err) {
    console.error('Diagnostics error:', err);
    res.status(500).json({
      error: 'Diagnostics failed',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

// @route   GET api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    // Get total shipments count
    const totalShipments = await Shipment.countDocuments();
    
    // Get shipments by status
    const shipmentsByStatus = await Shipment.aggregate([
      { $group: { _id: "$shipmentStatus", count: { $sum: 1 } } }
    ]);
    
    // Format shipments by status into an object
    const statusObj = {};
    shipmentsByStatus.forEach(status => {
      statusObj[status._id] = status.count;
    });
    
    // Get non-invoiced shipments
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments with customer info
    const recentShipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(10)
      .populate('customer', 'name')
      .lean();
    
    // Calculate financial metrics
    let totalCost = 0;
    let totalReceivables = 0;
    
    // Process shipments for financial data
    const processedShipments = recentShipments.map(shipment => {
      const cost = shipment.cost ? parseFloat(shipment.cost) : 0;
      const receivables = shipment.receivables ? parseFloat(shipment.receivables) : 0;
      
      totalCost += cost;
      totalReceivables += receivables;
      
      return {
        ...shipment,
        cost,
        receivables
      };
    });
    
    const totalProfit = totalReceivables - totalCost;
    
    // Return the dashboard summary data
    res.json({
      totalShipments,
      shipmentsByStatus: statusObj,
      totalNonInvoiced,
      recentShipments: processedShipments,
      totalCost,
      totalReceivables,
      totalProfit,
      statsData: [
        {
          title: 'Total Shipments',
          value: totalShipments,
          footer: 'All time shipments',
          icon: 'fa-shipping-fast',
          path: '/shipments'
        },
        {
          title: 'Pending',
          value: statusObj['Pending'] || 0,
          footer: 'Waiting to be shipped',
          icon: 'fa-clock',
          path: '/shipments?status=Pending'
        },
        {
          title: 'In Transit',
          value: statusObj['In Transit'] || 0,
          footer: 'Currently in transit',
          icon: 'fa-plane',
          path: '/shipments?status=In Transit'
        },
        {
          title: 'Non-Invoiced',
          value: totalNonInvoiced,
          footer: 'Shipments without invoice',
          icon: 'fa-file-invoice-dollar',
          path: '/shipments?invoiced=false'
        }
      ]
    });
  } catch (err) {
    console.error('Dashboard summary error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/dashboard/shipments-by-customer
// @desc    Get shipment counts by customer
// @access  Private
router.get('/shipments-by-customer', auth, async (req, res) => {
  try {
    const shipmentsByCustomer = await Shipment.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$customer',
          customerName: { $first: '$customerInfo.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Handle null customer names
    const processedData = shipmentsByCustomer.map(item => ({
      customerName: item.customerName || 'Unknown Customer',
      count: item.count
    }));
    
    res.json(processedData);
  } catch (err) {
    console.error('Shipments by customer error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/dashboard/shipments-by-date
// @desc    Get shipment counts by date for the last 30 days
// @access  Private
router.get('/shipments-by-date', auth, async (req, res) => {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const shipmentsByDate = await Shipment.aggregate([
      {
        $match: {
          dateAdded: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateAdded' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(shipmentsByDate.map(item => ({
      date: item._id,
      count: item.count
    })));
  } catch (err) {
    console.error('Shipments by date error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments that are delivered but not invoiced for over 7 days
// @access  Private
router.get('/overdue-non-invoiced', auth, async (req, res) => {
  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const overdueShipments = await Shipment.find({
      shipmentStatus: 'Arrived',
      invoiced: false,
      dateUpdated: { $lte: sevenDaysAgo }
    })
    .sort({ dateUpdated: 1 })
    .populate('customer', 'name')
    .lean();
    
    res.json(overdueShipments);
  } catch (err) {
    console.error('Overdue non-invoiced error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/dashboard/detailed-shipments
// @desc    Get detailed shipment data for charts
// @access  Private
router.get('/detailed-shipments', auth, async (req, res) => {
  try {
    const detailedShipments = await Shipment.find()
      .populate('customer', 'name')
      .lean();
      
    res.json(detailedShipments);
  } catch (err) {
    console.error('Detailed shipments error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router; 