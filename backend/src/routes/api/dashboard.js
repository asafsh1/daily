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
// @access  Private
router.get('/summary', auth, async (req, res) => {
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database connection not available' });
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
      .lean();

    // Transform shipments to handle missing or invalid customer references
    const transformedShipments = recentShipments.map(shipment => {
      // Create a safe customer object that doesn't require ObjectId casting
      const customerData = {
        _id: null,  // Using null instead of 'N/A' to avoid ObjectId casting issues
        name: 'Unknown Customer'
      };

      // Only try to use customer data if it exists and is valid
      if (shipment.customer && mongoose.Types.ObjectId.isValid(shipment.customer)) {
        customerData._id = shipment.customer;
        customerData.name = shipment.customerName || 'Unknown Customer';
      }

      return {
        ...shipment,
        customer: customerData
      };
    });

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
      recentShipments: transformedShipments,
      totalCost,
      totalReceivables,
      totalProfit
    });
  } catch (err) {
    console.error('Error in /api/dashboard/summary:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/dashboard/shipments-by-customer
// @desc    Get shipment counts by customer
// @access  Private
router.get('/shipments-by-customer', auth, async (req, res) => {
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database connection not available' });
  }
  
  try {
    const shipments = await Shipment.find().lean();
    
    // Process shipments to extract customer data
    const shipmentsByCustomer = {};
    
    shipments.forEach(shipment => {
      // Use customerName if available, otherwise use consigneeName or default
      const customerName = shipment.customerName || shipment.consigneeName || 'Unknown Customer';
      
      if (!shipmentsByCustomer[customerName]) {
        shipmentsByCustomer[customerName] = {
          count: 0,
          totalValue: 0
        };
      }
      
      shipmentsByCustomer[customerName].count++;
      shipmentsByCustomer[customerName].totalValue += shipment.receivables || 0;
    });
    
    // Convert to array format
    const result = Object.entries(shipmentsByCustomer).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.totalValue
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error in /api/dashboard/shipments-by-customer:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
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
// @desc    Get shipment counts by date
// @access  Private
router.get('/shipments-by-date', auth, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database connection not available' });
  }
  
  try {
    const shipments = await Shipment.find()
      .select('dateAdded receivables')
      .sort('dateAdded');
    
    const shipmentsByDate = {};
    
    shipments.forEach(shipment => {
      const date = moment(shipment.dateAdded).format('YYYY-MM-DD');
      if (!shipmentsByDate[date]) {
        shipmentsByDate[date] = {
          count: 0,
          value: 0
        };
      }
      shipmentsByDate[date].count += 1;
      shipmentsByDate[date].value += shipment.receivables || 0;
    });
    
    const result = Object.keys(shipmentsByDate).map(date => ({
      date,
      count: shipmentsByDate[date].count,
      value: shipmentsByDate[date].value
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error in /api/dashboard/shipments-by-date:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments that are delivered but not invoiced for over 7 days
// @access  Public (for testing, will be private later)
router.get('/overdue-non-invoiced', async (req, res) => {
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database connection not available' });
  }
  
  try {
    const sevenDaysAgo = moment().subtract(7, 'days').toDate();
    
    const overdueShipments = await Shipment.find({
      shipmentStatus: 'Arrived',
      invoiced: false,
      dateAdded: { $lt: sevenDaysAgo }
    })
    .sort({ dateAdded: 1 })
    .lean();
    
    // Transform shipments to handle invalid customer references
    const transformedShipments = overdueShipments.map(shipment => {
      // Process shipment data to ensure safe customer handling
      const result = { ...shipment };
      
      // Handle customer reference if needed
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        result.customer = null;
        result.customerName = shipment.customerName || 'Unknown Customer';
      }
      
      return result;
    });
    
    res.json(transformedShipments);
  } catch (err) {
    console.error('Error fetching overdue non-invoiced shipments:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/dashboard/detailed-shipments
// @desc    Get detailed shipment data for charts
// @access  Private
router.get('/detailed-shipments', auth, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database connection not available' });
  }
  
  try {
    const shipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(100)
      .lean();
    
    // Process shipments to handle any potential invalid references
    const processedShipments = shipments.map(shipment => {
      const processed = { ...shipment };
      
      // Handle customer reference
      if (shipment.customer) {
        if (!mongoose.Types.ObjectId.isValid(shipment.customer)) {
          processed.customer = null;
          processed.customerName = shipment.customerName || 'Unknown Customer';
        }
      }
      
      // Handle legs references if needed
      if (Array.isArray(shipment.legs)) {
        processed.legs = shipment.legs.filter(leg => 
          leg && mongoose.Types.ObjectId.isValid(leg)
        );
      }
      
      return processed;
    });
    
    res.json({
      shipments: processedShipments,
      pagination: {
        total: await Shipment.countDocuments(),
        limit: 100,
        page: 1
      }
    });
  } catch (err) {
    console.error('Error in /api/dashboard/detailed-shipments:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
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
      }
    };
    
    // Only attempt database operations if connected
    if (mongoose.connection.readyState === 1) {
      diagnostics.counts = {
        shipments: await Shipment.countDocuments(),
        users: await User.countDocuments()
      };
    } else {
      diagnostics.counts = {
        shipments: 'N/A - Database not connected',
        users: 'N/A - Database not connected'
      };
    }
    
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