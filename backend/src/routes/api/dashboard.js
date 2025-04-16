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

// Helper function to generate sample dashboard data when database is unavailable
const generateSampleDashboardData = () => {
  return {
    totalShipments: 125,
    shipmentsByStatus: [
      { _id: 'DELIVERED', count: 60 },
      { _id: 'IN_TRANSIT', count: 30 },
      { _id: 'PENDING', count: 20 },
      { _id: 'CANCELLED', count: 10 },
      { _id: 'DELAYED', count: 5 }
    ],
    totalNonInvoiced: 45,
    recentShipments: [
      {
        _id: 'sample-shipment-1',
        shipmentNumber: 'SHIP-001',
        customerName: 'Sample Customer 1',
        origin: 'New York',
        destination: 'Los Angeles',
        dateAdded: new Date().toISOString(),
        scheduledDate: new Date().toISOString(),
        shipmentStatus: 'IN_TRANSIT',
        cost: 1250,
        receivables: 1750
      },
      {
        _id: 'sample-shipment-2',
        shipmentNumber: 'SHIP-002',
        customerName: 'Sample Customer 2',
        origin: 'Chicago',
        destination: 'Miami',
        dateAdded: new Date().toISOString(),
        scheduledDate: new Date().toISOString(),
        shipmentStatus: 'DELIVERED',
        cost: 980,
        receivables: 1450
      },
      {
        _id: 'sample-shipment-3',
        shipmentNumber: 'SHIP-003',
        customerName: 'Sample Customer 3',
        origin: 'Austin',
        destination: 'Seattle',
        dateAdded: new Date().toISOString(),
        scheduledDate: new Date().toISOString(),
        shipmentStatus: 'PENDING',
        cost: 1750,
        receivables: 2300
      },
      {
        _id: 'sample-shipment-4',
        shipmentNumber: 'SHIP-004',
        customerName: 'Sample Customer 1',
        origin: 'Boston',
        destination: 'Denver',
        dateAdded: new Date().toISOString(),
        scheduledDate: new Date().toISOString(),
        shipmentStatus: 'DELAYED',
        cost: 1100,
        receivables: 1600
      },
      {
        _id: 'sample-shipment-5',
        shipmentNumber: 'SHIP-005',
        customerName: 'Sample Customer 4',
        origin: 'San Francisco',
        destination: 'Washington DC',
        dateAdded: new Date().toISOString(),
        scheduledDate: new Date().toISOString(),
        shipmentStatus: 'IN_TRANSIT',
        cost: 2200,
        receivables: 3100
      }
    ],
    totalCost: 7280,
    totalReceivables: 10200,
    totalProfit: 2920
  };
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
    // Get shipment counts by status
    const totalShipments = await Shipment.countDocuments();
    
    // Aggregation for shipment status counts
    const shipmentsByStatus = await Shipment.aggregate([
      {
        $group: {
          _id: '$shipmentStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Count non-invoiced shipments
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments
    const shipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .lean();
    
    // Transform shipments to handle any invalid references
    const transformedShipments = shipments.map(shipment => {
      const result = { ...shipment };
      
      // Handle customer reference
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        result.customer = null;
        result.customerName = shipment.customerName || 'Unknown Customer';
      }
      
      return result;
    });
    
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

// @route   GET api/dashboard/public-summary
// @desc    Get public dashboard summary data without authentication
// @access  Public
router.get('/public-summary', async (req, res) => {
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'Database connection not available' });
  }

  try {
    // Get shipment counts by status
    const totalShipments = await Shipment.countDocuments();
    
    // Aggregation for shipment status counts
    const shipmentsByStatus = await Shipment.aggregate([
      {
        $group: {
          _id: '$shipmentStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Count non-invoiced shipments
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments
    const shipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .lean();
    
    // Transform shipments to handle any invalid references
    const transformedShipments = shipments.map(shipment => {
      const result = { ...shipment };
      
      // Handle customer reference
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        result.customer = null;
        result.customerName = shipment.customerName || 'Unknown Customer';
      }
      
      return result;
    });
    
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
    console.error('Error in /api/dashboard/public-summary:', err.message);
    
    // Fallback to sample data if there's an error
    try {
      const sampleData = generateSampleDashboardData();
      console.log('Returning sample dashboard data due to error:', err.message);
      return res.json(sampleData);
    } catch (sampleErr) {
      console.error('Also failed to generate sample data:', sampleErr.message);
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/dashboard/public-dashboard-summary
// @desc    Get public dashboard summary data without authentication (alternate URL)
// @access  Public
router.get('/public-dashboard-summary', async (req, res) => {
  try {
    // Get shipment counts by status
    const totalShipments = await Shipment.countDocuments();
    
    // Aggregation for shipment status counts
    const shipmentsByStatus = await Shipment.aggregate([
      {
        $group: {
          _id: '$shipmentStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Count non-invoiced shipments
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    
    // Get recent shipments
    const shipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .lean();
    
    // Transform shipments to handle any invalid references
    const transformedShipments = shipments.map(shipment => {
      const result = { ...shipment };
      
      // Handle customer reference
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        result.customer = null;
        result.customerName = shipment.customerName || 'Unknown Customer';
      }
      
      return result;
    });
    
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
    console.error('Error in /api/dashboard/public-dashboard-summary:', err.message);
    
    // Fallback to sample data if there's an error
    try {
      const sampleData = generateSampleDashboardData();
      console.log('Returning sample dashboard data due to error:', err.message);
      return res.json(sampleData);
    } catch (sampleErr) {
      console.error('Also failed to generate sample data:', sampleErr.message);
    }
    
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
      // Skip shipments with invalid customer IDs
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        console.log(`Skipping shipment with invalid customer ID: ${shipment._id}`);
      }
      
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
    }).lean();
    
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
      // Skip shipments with invalid references if needed
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        console.log(`Processing shipment with invalid customer ID: ${shipment._id}`);
        // Continue processing but with null customer reference
        shipment.customer = null;
      }
      
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
      .select('dateAdded receivables customer customerName')
      .sort('dateAdded')
      .lean();
    
    const shipmentsByDate = {};
    
    shipments.forEach(shipment => {
      // Handle invalid customer ID
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        shipment.customer = null;
        shipment.customerName = shipment.customerName || 'Unknown Customer';
      }
      
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
      try {
        diagnostics.counts = {
          shipments: await Shipment.countDocuments(),
          users: await User.countDocuments()
        };
        
        // Add information about invalid ObjectIds if any exist
        const invalidCustomerIds = await Shipment.countDocuments({
          customer: { $exists: true, $ne: null },
          $where: "!this.customer.match(/^[0-9a-fA-F]{24}$/)"
        });
        
        if (invalidCustomerIds > 0) {
          diagnostics.warnings = {
            invalidCustomerIds: invalidCustomerIds
          };
        }
      } catch (dbErr) {
        diagnostics.counts = {
          error: dbErr.message,
          shipments: 'Error counting',
          users: 'Error counting'
        };
      }
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

// @route   GET api/public-diagnostics
// @desc    Get public diagnostics and dev token
// @access  Public
router.get('/public-diagnostics', async (req, res) => {
  try {
    const diagnostics = {
      server: {
        status: 'online',
        timestamp: new Date(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      database: {
        readyState: mongoose.connection.readyState,
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    };

    // Generate a demo token (only for non-production)
    if (process.env.NODE_ENV !== 'production') {
      const jwt = require('jsonwebtoken');
      const payload = {
        user: {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'viewer'
        }
      };
      
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'developmentsecret',
        { expiresIn: '1 day' }
      );
      
      diagnostics.auth = {
        devToken: token,
        note: 'This token is for development purposes only.'
      };
    }
    
    res.json(diagnostics);
  } catch (err) {
    console.error('Error fetching public diagnostics:', err.message);
    res.status(500).json({
      error: err.message,
      server: {
        status: 'error',
        timestamp: new Date()
      }
    });
  }
});

module.exports = router; 