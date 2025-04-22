const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkAdmin } = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const { checkConnectionState } = require('../../mongodb-connect');

const Shipment = require('../../models/Shipment');
const User = require('../../models/User');
const Customer = require('../../models/Customer');

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
// @desc    Get dashboard summary data without authentication
// @access  Public
router.get('/public-summary', async (req, res) => {
  console.log('Public summary dashboard endpoint called');
  
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.log('Database connection not available, returning sample data');
    return res.json(generateSampleDashboardData());
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
    console.error('Error in public summary endpoint:', err.message);
    res.json(generateSampleDashboardData());
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
    // Check if user has sufficient privileges (admin or manager)
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ msg: 'Access denied: Admin or Manager role required' });
    }
    
    const shipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(100)
      .lean();

    // Process shipments for charts
    const processedData = shipments.map(shipment => {
      // Log and handle invalid customer references
      if (shipment.customer === null && shipment.customerId) {
        console.warn(`Invalid customer reference detected in shipment ${shipment._id} - customerId: ${shipment.customerId}`);
      }
      
      // Handle invalid customer ID
      let customerName = 'Unknown Customer';
      if (shipment.customer) {
        if (!mongoose.Types.ObjectId.isValid(shipment.customer)) {
          shipment.customer = null;
        } else {
          customerName = shipment.customerName || 'Unknown Customer';
        }
      }
      
      return {
        id: shipment._id,
        customer: customerName,
        amount: shipment.totalCost || shipment.cost || 0,
        status: shipment.status || shipment.shipmentStatus,
        date: shipment.createdAt || shipment.dateAdded,
        invoiced: shipment.invoiced || false,
        paid: shipment.paid || false
      };
    });

    res.json(processedData);
  } catch (err) {
    console.error('Error in detailed-shipments route:', err);
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

// @route   GET api/dashboard/public-all
// @desc    Get all dashboard data without authentication, combined endpoint for frontend
// @access  Public
router.get('/public-all', async (req, res) => {
  console.log('Public-all dashboard endpoint called');
  
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.log('Database connection not available, returning sample data');
    const sampleData = {
      summary: generateSampleDashboardData(),
      monthlyStats: generateSampleMonthlyStats(),
      customerData: generateSampleCustomerData(),
      dailyStats: generateSampleDailyStats()
    };
    console.log('Returning sample daily stats array:', sampleData.dailyStats);
    return res.json(sampleData);
  }
  
  try {
    console.log('Fetching dashboard data from database');
    // Prepare the response object
    const response = {
      summary: {},
      monthlyStats: [],
      customerData: [],
      dailyStats: []
    };
    
    // 1. Get summary data
    try {
      // Get counts from collections
      const [
        shipmentCount,
        customerCount,
        recentShipments,
        activeShipments,
      ] = await Promise.all([
        Shipment.countDocuments(),
        Customer.countDocuments(),
        Shipment.find().sort({ dateAdded: -1 }).limit(5).lean(),
        Shipment.find({ 
          shipmentStatus: { $in: ['In Transit', 'Pending'] },
        }).countDocuments()
      ]);
      
      // Calculate financial metrics
      const financialMetrics = await Shipment.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $toDouble: { $ifNull: ["$receivables", 0] } } },
            totalCost: { $sum: { $toDouble: { $ifNull: ["$cost", 0] } } },
            totalProfit: { 
              $sum: { 
                $subtract: [
                  { $toDouble: { $ifNull: ["$receivables", 0] } }, 
                  { $toDouble: { $ifNull: ["$cost", 0] } }
                ] 
              } 
            },
            averageMargin: { 
              $avg: { 
                $cond: [
                  { $gt: [{ $toDouble: { $ifNull: ["$receivables", 0] } }, 0] },
                  { 
                    $multiply: [
                      { 
                        $divide: [
                          { 
                            $subtract: [
                              { $toDouble: { $ifNull: ["$receivables", 0] } }, 
                              { $toDouble: { $ifNull: ["$cost", 0] } }
                            ] 
                          },
                          { $toDouble: { $ifNull: ["$receivables", 0] } }
                        ] 
                      },
                      100
                    ]
                  },
                  0
                ]
              } 
            }
          }
        }
      ]);
      
      // Format the summary data
      response.summary = {
        counts: {
          shipments: shipmentCount || 0,
          customers: customerCount || 0,
          activeShipments: activeShipments || 0
        },
        financials: financialMetrics.length > 0 ? {
          totalRevenue: Math.round(financialMetrics[0].totalRevenue * 100) / 100 || 0,
          totalCost: Math.round(financialMetrics[0].totalCost * 100) / 100 || 0,
          totalProfit: Math.round(financialMetrics[0].totalProfit * 100) / 100 || 0,
          averageMargin: Math.round(financialMetrics[0].averageMargin * 100) / 100 || 0
        } : {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          averageMargin: 0
        },
        recentShipments: recentShipments.map(shipment => ({
          id: shipment._id,
          customer: shipment.customerName || 'Unknown',
          date: shipment.dateAdded,
          status: shipment.shipmentStatus || 'Pending',
          value: shipment.receivables || 0
        }))
      };
      
    } catch (err) {
      console.error('Error fetching summary data:', err.message);
      response.summary = generateSampleDashboardData();
    }
    
    // 2. Get customer data
    try {
      const customerData = await Shipment.aggregate([
        {
          $group: {
            _id: { 
              customerId: { $ifNull: ["$customer", "unknown"] },
              customerName: { $ifNull: ["$customerName", "Unknown Customer"] }
            },
            count: { $sum: 1 },
            revenue: { $sum: { $toDouble: { $ifNull: ["$receivables", 0] } } },
            cost: { $sum: { $toDouble: { $ifNull: ["$cost", 0] } } }
          }
        },
        {
          $project: {
            _id: 0,
            customerId: "$_id.customerId",
            customerName: "$_id.customerName",
            count: 1,
            revenue: 1,
            cost: 1,
            profit: { $subtract: ["$revenue", "$cost"] },
            margin: { 
              $cond: [
                { $gt: ["$revenue", 0] },
                { $multiply: [{ $divide: [{ $subtract: ["$revenue", "$cost"] }, "$revenue"] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      // Add customer data to response
      response.customerData = customerData.map(item => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
        cost: Math.round(item.cost * 100) / 100,
        profit: Math.round(item.profit * 100) / 100,
        margin: Math.round(item.margin * 100) / 100
      }));
      
    } catch (err) {
      console.error('Error fetching customer data:', err.message);
      response.customerData = generateSampleCustomerData();
    }
    
    // 3. Get monthly stats
    try {
      const monthlyStats = await Shipment.aggregate([
        {
          $group: {
            _id: { 
              year: { $year: { $toDate: "$dateAdded" } },
              month: { $month: { $toDate: "$dateAdded" } }
            },
            count: { $sum: 1 },
            revenue: { $sum: { $toDouble: { $ifNull: ["$receivables", 0] } } },
            cost: { $sum: { $toDouble: { $ifNull: ["$cost", 0] } } }
          }
        },
        {
          $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            count: 1,
            revenue: 1,
            cost: 1,
            profit: { $subtract: ["$revenue", "$cost"] },
            margin: { 
              $cond: [
                { $gt: ["$revenue", 0] },
                { $multiply: [{ $divide: [{ $subtract: ["$revenue", "$cost"] }, "$revenue"] }, 100] },
                0
              ]
            }
          }
        },
        {
          $sort: { year: -1, month: -1 }
        },
        {
          $limit: 12
        }
      ]);
      
      // Add monthly stats to response
      response.monthlyStats = monthlyStats.map(item => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
        cost: Math.round(item.cost * 100) / 100,
        profit: Math.round(item.profit * 100) / 100,
        margin: Math.round(item.margin * 100) / 100
      }));
      
    } catch (err) {
      console.error('Error fetching monthly stats:', err.message);
      response.monthlyStats = generateSampleMonthlyStats();
    }
    
    // 4. Get daily stats (specifically for the chart)
    try {
      const dailyStats = await Shipment.aggregate([
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$dateAdded" } } },
            value: { $toDouble: { $ifNull: ["$receivables", 0] } }
          }
        },
        {
          $group: {
            _id: "$date",
            count: { $sum: 1 },
            value: { $sum: "$value" }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            count: 1,
            value: 1
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);
      
      // Add date stats to response
      response.dailyStats = dailyStats;
      console.log(`Found ${dailyStats.length} daily stats entries`);
      
      // Make sure dailyStats is never empty by filling in missing days
      if (dailyStats.length === 0) {
        // Generate entries for the last 30 days
        const today = new Date();
        for (let i = 30; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          response.dailyStats.push({
            date: dateStr,
            count: 0,
            value: 0
          });
        }
      }
      
    } catch (err) {
      console.error('Error fetching daily stats:', err.message);
      response.dailyStats = generateSampleDailyStats();
    }
    
    // Return the combined dashboard data
    console.log('Returning dashboard data', {
      summaryAvailable: Object.keys(response.summary).length > 0,
      customerDataCount: response.customerData.length,
      monthlyStatsCount: response.monthlyStats.length,
      dailyStatsCount: response.dailyStats.length
    });
    
    // Ensure that dailyStats is an array and not empty
    if (!Array.isArray(response.dailyStats) || response.dailyStats.length === 0) {
      console.log('dailyStats is not an array or empty, generating sample data');
      response.dailyStats = generateSampleDailyStats();
    }
    
    res.json(response);
    
  } catch (err) {
    console.error('Error in public-all dashboard endpoint:', err.message);
    
    // Return sample data for all metrics if there's an error
    const response = {
      summary: generateSampleDashboardData(),
      monthlyStats: generateSampleMonthlyStats(),
      customerData: generateSampleCustomerData(),
      dailyStats: generateSampleDailyStats()
    };
    console.log('Returning sample data due to error');
    res.json(response);
  }
});

// @route   GET api/dashboard/public-shipments-by-date
// @desc    Get shipments by date without authentication
// @access  Public
router.get('/public-shipments-by-date', async (req, res) => {
  console.log('Public shipments-by-date endpoint called');
  
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.log('Database connection not available, returning sample data');
    return res.json(generateSampleDailyStats());
  }
  
  try {
    // Get date range - default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Aggregate shipments by date
    const dailyShipments = await Shipment.aggregate([
      {
        $match: {
          dateAdded: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$dateAdded" },
            month: { $month: "$dateAdded" },
            day: { $dayOfMonth: "$dateAdded" }
          },
          count: { $sum: 1 },
          value: { $sum: { $toDouble: { $ifNull: ["$receivables", 0] } } }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: "$_id.day"
                }
              }
            }
          },
          count: 1,
          value: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    res.json(dailyShipments);
  } catch (err) {
    console.error('Error in public shipments by date endpoint:', err.message);
    res.json(generateSampleDailyStats());
  }
});

// @route   GET api/dashboard/public-shipments-by-customer
// @desc    Get shipments by customer without authentication
// @access  Public
router.get('/public-shipments-by-customer', async (req, res) => {
  console.log('Public shipments-by-customer endpoint called');
  
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.log('Database connection not available, returning sample data');
    return res.json(generateSampleCustomerData());
  }
  
  try {
    // Aggregate shipments by customer
    const customerShipments = await Shipment.aggregate([
      {
        $group: {
          _id: { 
            customerId: { $ifNull: ["$customer", "unknown"] },
            customerName: { $ifNull: ["$customerName", "Unknown Customer"] }
          },
          count: { $sum: 1 },
          value: { $sum: { $toDouble: { $ifNull: ["$receivables", 0] } } }
        }
      },
      {
        $project: {
          _id: 0,
          customer: {
            $cond: [
              { $eq: ["$_id.customerName", "Unknown Customer"] },
              {
                $cond: [
                  { $eq: [{ $type: "$_id.customerId" }, "objectId"] },
                  "Unknown Customer",
                  { $ifNull: ["$_id.customerId", "Unknown Customer"] }
                ]
              },
              "$_id.customerName"
            ]
          },
          count: 1,
          value: 1
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json(customerShipments);
  } catch (err) {
    console.error('Error in public shipments by customer endpoint:', err.message);
    res.json(generateSampleCustomerData());
  }
});

module.exports = router; 