const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const moment = require('moment');

const Shipment = require('../../models/Shipment');
const User = require('../../models/User');

// @route   GET api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Public (for testing, will be private later)
router.get('/summary', async (req, res) => {
  try {
    // Get total shipments
    const totalShipments = await Shipment.countDocuments();
    
    // Get shipments by status
    const shipmentsByStatus = {
      draft: await Shipment.countDocuments({ status: 'draft' }),
      confirmed: await Shipment.countDocuments({ status: 'confirmed' }),
      intransit: await Shipment.countDocuments({ status: 'intransit' }),
      delivered: await Shipment.countDocuments({ status: 'delivered' }),
      completed: await Shipment.countDocuments({ status: 'completed' })
    };
    
    // Get total non-invoiced shipments
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments (last 5)
    const recentShipments = await Shipment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', ['name', 'email'])
      .populate('consignee', ['name', 'address'])
      .populate('shipper', ['name', 'address']);

    // Get financial metrics
    const shipments = await Shipment.find();
    
    // Calculate total cost, total receivables and total profit
    const totalCost = shipments.reduce((acc, shipment) => acc + (shipment.totalCost || 0), 0);
    const totalReceivables = shipments.reduce((acc, shipment) => acc + (shipment.totalReceivables || 0), 0);
    const totalProfit = totalReceivables - totalCost;

    // Return all data
    res.json({
      totalShipments,
      shipmentsByStatus,
      totalNonInvoiced,
      recentShipments,
      totalCost,
      totalReceivables,
      totalProfit
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/shipments-by-customer
// @desc    Get shipment counts by customer
// @access  Public (for testing, will be private later)
router.get('/shipments-by-customer', async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate('consignee', ['name']);
    
    // Process shipments to extract customer data
    const shipmentsByCustomer = {};
    
    shipments.forEach(shipment => {
      const customerName = shipment.consignee ? shipment.consignee.name : 'Unknown Customer';
      
      if (!shipmentsByCustomer[customerName]) {
        shipmentsByCustomer[customerName] = {
          count: 0,
          totalValue: 0
        };
      }
      
      shipmentsByCustomer[customerName].count += 1;
      shipmentsByCustomer[customerName].totalValue += shipment.totalReceivables || 0;
    });
    
    // Convert to array format for chart
    const result = Object.keys(shipmentsByCustomer).map(customer => ({
      name: customer,
      count: shipmentsByCustomer[customer].count,
      value: shipmentsByCustomer[customer].totalValue
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching shipments by customer:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/monthly-stats
// @desc    Get shipment statistics by month
// @access  Public (for testing, will be private later)
router.get('/monthly-stats', async (req, res) => {
  try {
    // Calculate date range for last 12 months
    const endDate = moment();
    const startDate = moment().subtract(12, 'months');
    
    // Get all shipments created within the date range
    const shipments = await Shipment.find({
      createdAt: { 
        $gte: startDate.toDate(), 
        $lte: endDate.toDate() 
      }
    });
    
    // Initialize monthly data structure
    const monthlyData = {};
    for (let i = 0; i < 12; i++) {
      const monthKey = moment().subtract(i, 'months').format('MMM YYYY');
      monthlyData[monthKey] = {
        month: monthKey,
        shipmentCount: 0,
        totalValue: 0,
        totalCost: 0,
        profit: 0
      };
    }
    
    // Process shipments to aggregate monthly data
    shipments.forEach(shipment => {
      const monthKey = moment(shipment.createdAt).format('MMM YYYY');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].shipmentCount += 1;
        monthlyData[monthKey].totalValue += (shipment.totalReceivables || 0);
        monthlyData[monthKey].totalCost += (shipment.totalCost || 0);
        monthlyData[monthKey].profit = monthlyData[monthKey].totalValue - monthlyData[monthKey].totalCost;
      }
    });
    
    // Convert to array and sort chronologically
    const result = Object.values(monthlyData).sort((a, b) => 
      moment(a.month, 'MMM YYYY') - moment(b.month, 'MMM YYYY')
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching monthly statistics:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/shipments-by-date
// @desc    Get shipment counts by date (last 30 days)
// @access  Public (for testing, will be private later)
router.get('/shipments-by-date', async (req, res) => {
  try {
    // Calculate date range for last 30 days
    const endDate = moment();
    const startDate = moment().subtract(30, 'days');
    
    // Get all shipments created within the date range
    const shipments = await Shipment.find({
      createdAt: { 
        $gte: startDate.toDate(), 
        $lte: endDate.toDate() 
      }
    });
    
    // Initialize daily data structure
    const dailyData = {};
    for (let i = 0; i < 30; i++) {
      const dateKey = moment().subtract(i, 'days').format('YYYY-MM-DD');
      dailyData[dateKey] = {
        date: dateKey,
        count: 0
      };
    }
    
    // Process shipments to aggregate daily data
    shipments.forEach(shipment => {
      const dateKey = moment(shipment.createdAt).format('YYYY-MM-DD');
      if (dailyData[dateKey]) {
        dailyData[dateKey].count += 1;
      }
    });
    
    // Convert to array and sort chronologically
    const result = Object.values(dailyData).sort((a, b) => 
      moment(a.date) - moment(b.date)
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching shipments by date:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments that are delivered but not invoiced for over 7 days
// @access  Public (for testing, will be private later)
router.get('/overdue-non-invoiced', async (req, res) => {
  try {
    const sevenDaysAgo = moment().subtract(7, 'days').toDate();
    
    const overdueShipments = await Shipment.find({
      status: 'delivered',
      invoiced: false,
      deliveryDate: { $lt: sevenDaysAgo }
    })
    .sort({ deliveryDate: 1 })
    .populate('consignee', ['name', 'address'])
    .populate('shipper', ['name', 'address']);
    
    res.json(overdueShipments);
  } catch (err) {
    console.error('Error fetching overdue non-invoiced shipments:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/detailed-shipments
// @desc    Get detailed shipment data for charts
// @access  Public (for testing, will be private later)
router.get('/detailed-shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', ['name', 'email'])
      .populate('consignee', ['name', 'address'])
      .populate('shipper', ['name', 'address']);
    
    res.json({
      shipments,
      pagination: {
        total: await Shipment.countDocuments(),
        limit: 100,
        page: 1
      }
    });
  } catch (err) {
    console.error('Error fetching detailed shipments:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/dashboard/diagnostics
// @desc    Get system diagnostics information
// @access  Public (for testing, will be private later)
router.get('/diagnostics', async (req, res) => {
  try {
    const diagnostics = {
      server: {
        status: 'online',
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node: process.version,
        platform: process.platform
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        host: mongoose.connection.host || 'unknown',
        name: mongoose.connection.name || 'unknown'
      },
      counts: {
        shipments: await Shipment.countDocuments(),
        users: await User.countDocuments()
      }
    };
    
    res.json(diagnostics);
  } catch (err) {
    console.error('Error fetching diagnostics:', err.message);
    res.status(500).json({
      server: {
        status: 'error',
        timestamp: new Date(),
        error: err.message
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        error: err.message
      }
    });
  }
});

module.exports = router; 