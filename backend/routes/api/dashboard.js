const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const { checkConnectionState } = require('../../mongodb-connect');

const Shipment = require('../../models/Shipment');
const User = require('../../models/User');

// Function to load sample data if database is not available
const getSampleShipments = () => {
  try {
    const sampleDataPath = path.join(__dirname, '../../data/sample-shipments.json');
    if (fs.existsSync(sampleDataPath)) {
      console.log('Loading sample shipments data for dashboard');
      const data = fs.readFileSync(sampleDataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading sample data:', err.message);
  }
  return [];
};

// Generate sample dashboard data
const generateSampleDashboardData = () => {
  const sampleShipments = getSampleShipments();
  
  // Generate sample summary data
  const summary = {
    totalShipments: sampleShipments.length,
    shipmentsByStatus: {
      draft: 1,
      confirmed: 1,
      intransit: 2,
      delivered: 1,
      completed: 1
    },
    totalNonInvoiced: 3,
    recentShipments: sampleShipments.slice(0, 5).map(s => ({
      ...s,
      customer: {
        _id: s.customer._id,
        name: s.customer.name
      }
    })),
    totalCost: 15000,
    totalReceivables: 25000,
    totalProfit: 10000
  };
  
  return summary;
};

// Generate sample customer data
const generateSampleCustomerData = () => {
  return [
    { name: 'Sample Customer 1', count: 3, value: 12000 },
    { name: 'Sample Customer 2', count: 2, value: 8000 },
    { name: 'Sample Customer 3', count: 1, value: 5000 }
  ];
};

// Generate sample monthly stats
const generateSampleMonthlyStats = () => {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthKey = moment().subtract(i, 'months').format('MMM YYYY');
    months.push({
      month: monthKey,
      shipmentCount: Math.floor(Math.random() * 10) + 5,
      totalValue: Math.floor(Math.random() * 10000) + 5000,
      totalCost: Math.floor(Math.random() * 5000) + 2000,
      profit: Math.floor(Math.random() * 5000) + 1000
    });
  }
  return months.reverse();
};

// Generate sample daily stats
const generateSampleDailyStats = () => {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const dateKey = moment().subtract(i, 'days').format('YYYY-MM-DD');
    days.push({
      date: dateKey,
      count: Math.floor(Math.random() * 3)
    });
  }
  return days.reverse();
};

// @route   GET api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Public (for testing, will be private later)
router.get('/summary', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    console.log('Database not connected, using sample dashboard data');
    const sampleData = generateSampleDashboardData();
    return res.json(sampleData);
  }
  
  try {
    // Get total shipments
    const totalShipments = await Shipment.countDocuments();
    
    // Get shipments by status
    const shipmentsByStatus = {
      draft: await Shipment.countDocuments({ shipmentStatus: 'Pending' }),
      confirmed: await Shipment.countDocuments({ shipmentStatus: 'Confirmed' }),
      intransit: await Shipment.countDocuments({ shipmentStatus: 'In Transit' }),
      delivered: await Shipment.countDocuments({ shipmentStatus: 'Arrived' }),
      completed: await Shipment.countDocuments({ shipmentStatus: 'Completed' })
    };
    
    // Get total non-invoiced shipments
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments (last 5)
    const recentShipments = await Shipment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name')
      .lean();

    // Get financial metrics
    const shipments = await Shipment.find();
    
    // Calculate total cost, total receivables and total profit
    const totalCost = shipments.reduce((acc, shipment) => acc + (shipment.cost || 0), 0);
    const totalReceivables = shipments.reduce((acc, shipment) => acc + (shipment.receivables || 0), 0);
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
    
    // Return sample data if there's an error
    const sampleData = generateSampleDashboardData();
    return res.json(sampleData);
  }
});

// @route   GET api/dashboard/shipments-by-customer
// @desc    Get shipment counts by customer
// @access  Public (for testing, will be private later)
router.get('/shipments-by-customer', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    console.log('Database not connected, using sample customer data');
    return res.json(generateSampleCustomerData());
  }
  
  try {
    const shipments = await Shipment.find()
      .populate('customer', 'name');
    
    // Process shipments to extract customer data
    const shipmentsByCustomer = {};
    
    shipments.forEach(shipment => {
      // Use consigneeName if the customer populate failed
      const customerName = (shipment.customer && shipment.customer.name) ? 
        shipment.customer.name : (shipment.consigneeName || 'Unknown Customer');
      
      if (!shipmentsByCustomer[customerName]) {
        shipmentsByCustomer[customerName] = {
          count: 0,
          totalValue: 0
        };
      }
      
      shipmentsByCustomer[customerName].count += 1;
      shipmentsByCustomer[customerName].totalValue += shipment.receivables || 0;
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
    return res.json(generateSampleCustomerData());
  }
});

// @route   GET api/dashboard/monthly-stats
// @desc    Get shipment statistics by month
// @access  Public (for testing, will be private later)
router.get('/monthly-stats', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    console.log('Database not connected, using sample monthly stats');
    return res.json(generateSampleMonthlyStats());
  }
  
  try {
    // Calculate date range for last 12 months
    const endDate = moment();
    const startDate = moment().subtract(12, 'months');
    
    // Get all shipments created within the date range
    const shipments = await Shipment.find({
      dateAdded: { 
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
      const monthKey = moment(shipment.dateAdded).format('MMM YYYY');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].shipmentCount += 1;
        monthlyData[monthKey].totalValue += (shipment.receivables || 0);
        monthlyData[monthKey].totalCost += (shipment.cost || 0);
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
    return res.json(generateSampleMonthlyStats());
  }
});

// @route   GET api/dashboard/shipments-by-date
// @desc    Get shipment counts by date (last 30 days)
// @access  Public (for testing, will be private later)
router.get('/shipments-by-date', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    console.log('Database not connected, using sample daily stats');
    return res.json(generateSampleDailyStats());
  }
  
  try {
    // Calculate date range for last 30 days
    const endDate = moment();
    const startDate = moment().subtract(30, 'days');
    
    // Get all shipments created within the date range
    const shipments = await Shipment.find({
      dateAdded: { 
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
      const dateKey = moment(shipment.dateAdded).format('YYYY-MM-DD');
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
    return res.json(generateSampleDailyStats());
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments that are delivered but not invoiced for over 7 days
// @access  Public (for testing, will be private later)
router.get('/overdue-non-invoiced', async (req, res) => {
  try {
    const sevenDaysAgo = moment().subtract(7, 'days').toDate();
    
    const overdueShipments = await Shipment.find({
      shipmentStatus: 'Arrived',
      invoiced: false,
      dateAdded: { $lt: sevenDaysAgo }
    })
    .sort({ dateAdded: 1 })
    .populate('customer', 'name')
    .lean();
    
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
      .sort({ dateAdded: -1 })
      .limit(100)
      .populate('customer', 'name')
      .populate('legs')
      .lean();
    
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