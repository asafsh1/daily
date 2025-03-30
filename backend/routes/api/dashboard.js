const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');
const Customer = require('../../models/Customer');
const mongoose = require('mongoose');

// @route   GET api/dashboard/summary
// @desc    Get dashboard summary statistics
// @access  Public
router.get('/summary', async (req, res) => {
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
    
    console.log('Database connected, fetching dashboard data');
    
    // Get total shipments count
    const totalShipments = await Shipment.countDocuments();
    console.log('Total shipments:', totalShipments);
    
    // Get recent shipments with customer data - handle both ObjectId and string customer references
    const recentShipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .lean();
    
    // Process customers for each shipment
    const processedShipments = await Promise.all(recentShipments.map(async (shipment) => {
      try {
        // Process customer field
        if (shipment.customer) {
          // Check if it's an ObjectId
          if (mongoose.Types.ObjectId.isValid(shipment.customer)) {
            try {
              const customerDoc = await Customer.findById(shipment.customer).lean();
              if (customerDoc) {
                shipment.customer = { 
                  _id: customerDoc._id, 
                  name: customerDoc.name 
                };
              } else {
                shipment.customer = { name: 'Unknown' };
              }
            } catch (err) {
              console.error('Error finding customer:', err.message);
              shipment.customer = { name: 'Unknown' };
            }
          } else if (typeof shipment.customer === 'string') {
            // If it's already a string name, format it as an object
            shipment.customer = { name: shipment.customer };
          }
        } else {
          shipment.customer = { name: 'Unknown' };
        }
        
        // Get legs data
        if (shipment._id) {
          const legs = await ShipmentLeg.find({ shipmentId: shipment._id })
            .sort({ legOrder: 1 })
            .lean();
          
          shipment.legs = legs;
        }
        
        return shipment;
      } catch (err) {
        console.error('Error processing shipment:', err);
        return shipment;
      }
    }));
    
    // Get shipments by status
    const shipmentStatusCounts = await Shipment.aggregate([
      { $group: { _id: '$shipmentStatus', count: { $sum: 1 } } }
    ]);
    
    const shipmentsByStatus = {
      'Pending': 0,
      'In Transit': 0,
      'Arrived': 0,
      'Delayed': 0,
      'Canceled': 0
    };
    
    shipmentStatusCounts.forEach(status => {
      if (status._id) {
        // Handle compound statuses like "In Transit (Leg 1)"
        const baseStatus = status._id.split(' ')[0] + (status._id.includes('Transit') ? ' Transit' : '');
        
        if (shipmentsByStatus[baseStatus] !== undefined) {
          shipmentsByStatus[baseStatus] += status.count;
        } else if (status._id.includes('Transit')) {
          shipmentsByStatus['In Transit'] += status.count;
        } else {
          shipmentsByStatus[status._id] = status.count;
        }
      }
    });
    
    console.log('Shipments by status:', shipmentsByStatus);
    
    // Get non-invoiced shipments count
    const totalNonInvoiced = await Shipment.countDocuments({ invoiced: false });
    console.log('Non-invoiced shipments:', totalNonInvoiced);
    
    // Get shipments by customer - handle mixed customer references
    let shipmentsByCustomer = [];
    
    try {
      // First try to get customers that are ObjectIds
      const shipmentsByCustomerId = await Shipment.aggregate([
        { 
          $match: { 
            customer: { 
              $type: 'objectId' 
            } 
          } 
        },
        { 
          $group: { 
            _id: '$customer', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      // Get customer names for ObjectId references
      const customerIds = shipmentsByCustomerId.map(item => item._id);
      const customers = await Customer.find({ 
        _id: { $in: customerIds } 
      }).select('name').lean();
      
      const customerMap = {};
      customers.forEach(customer => {
        customerMap[customer._id.toString()] = customer.name;
      });
      
      shipmentsByCustomer = shipmentsByCustomerId.map(item => ({
        customer: customerMap[item._id.toString()] || 'Unknown',
        count: item.count
      }));
      
      // Add any string-based customer groupings
      const shipmentsByCustomerString = await Shipment.aggregate([
        { 
          $match: { 
            customer: { 
              $type: 'string' 
            } 
          } 
        },
        { 
          $group: { 
            _id: '$customer', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      const stringCustomers = shipmentsByCustomerString.map(item => ({
        customer: item._id || 'Unknown',
        count: item.count
      }));
      
      // Combine results
      shipmentsByCustomer = [...shipmentsByCustomer, ...stringCustomers];
      
      // Sort and limit
      shipmentsByCustomer.sort((a, b) => b.count - a.count);
      shipmentsByCustomer = shipmentsByCustomer.slice(0, 5);
      
    } catch (err) {
      console.error('Error getting shipments by customer:', err.message);
    }
    
    console.log('Shipments by customer:', shipmentsByCustomer);
    
    const response = {
      totalShipments,
      recentShipments: processedShipments,
      shipmentsByStatus,
      totalNonInvoiced,
      shipmentsByCustomer
    };
    
    console.log('Dashboard summary prepared');
    res.json(response);
  } catch (err) {
    console.error('Dashboard summary error:', err.message, err.stack);
    
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
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      // Return empty data with same structure to avoid frontend errors
      return res.json({
        totalShipments: 0,
        shipmentsByStatus: {
          pending: 0,
          arrived: 0,
          delayed: 0,
          canceled: 0
        },
        invoiceStats: {
          invoiced: 0,
          nonInvoiced: 0
        },
        recentShipments: []
      });
    }
    
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
    console.error('Dashboard stats error:', err.message);
    
    // Return empty data with same structure instead of error
    res.json({
      totalShipments: 0,
      shipmentsByStatus: {
        pending: 0,
        arrived: 0,
        delayed: 0,
        canceled: 0
      },
      invoiceStats: {
        invoiced: 0,
        nonInvoiced: 0
      },
      recentShipments: []
    });
  }
});

// @route   GET api/dashboard/monthly-stats
// @desc    Get monthly statistics
// @access  Public
router.get('/monthly-stats', async (req, res) => {
  try {
    console.log('Processing monthly statistics request');
    
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      // Return empty monthly data
      return res.json(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0
      })));
    }
    
    console.log('Database connected, fetching monthly stats');
    
    // Get the current year or use the one from query parameter
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    console.log('Getting monthly stats for year:', year);
    
    // Create date range for the year
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
    
    console.log('Date range:', startDate, 'to', endDate);
    
    // Use aggregation to get monthly counts in a single query
    const monthlyStats = await Shipment.aggregate([
      {
        $match: {
          dateAdded: {
            $gte: startDate,
            $lte: endDate
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
    
    console.log('Monthly stats query result:', monthlyStats);
    
    // Fill in missing months with zero counts
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0
    }));
    
    // Update with actual data
    monthlyStats.forEach(stat => {
      if (stat.month >= 1 && stat.month <= 12) {
        monthlyData[stat.month - 1].count = stat.count;
      }
    });
    
    console.log('Monthly stats prepared');
    res.json(monthlyData);
  } catch (err) {
    console.error('Monthly stats error:', err.message, err.stack);
    
    // Return empty monthly data
    res.json(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0
    })));
  }
});

// @route   GET api/dashboard/overdue-non-invoiced
// @desc    Get shipments with passed arrival dates that aren't invoiced
// @access  Public
router.get('/overdue-non-invoiced', async (req, res) => {
  try {
    console.log('Processing overdue non-invoiced request');
    
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      return res.json([]);
    }
    
    console.log('Database connected, fetching overdue shipments');
    
    const currentDate = new Date();
    console.log('Current date:', currentDate);
    
    // Find shipments where:
    // 1. Any of these conditions are met:
    //    a. Scheduled arrival date has passed
    //    b. The last leg arrival date has passed
    //    c. The shipment status is "Arrived"
    // 2. Either not invoiced or invoice not sent
    const baseQuery = {
      $or: [
        { invoiced: false },
        { invoiceSent: false }
      ]
    };
    
    // Get all potential overdue shipments
    const shipments = await Shipment.find(baseQuery)
      .sort({ dateAdded: -1 })
      .lean();
    
    console.log(`Found ${shipments.length} potential overdue shipments`);
    
    // Process shipments to include customer data and check arrival
    const overdueShipments = await Promise.all(shipments.map(async (shipment) => {
      try {
        // Process customer - handle both ObjectId and string references
        if (shipment.customer) {
          if (mongoose.Types.ObjectId.isValid(shipment.customer)) {
            try {
              const customerDoc = await Customer.findById(shipment.customer).lean();
              if (customerDoc) {
                shipment.customer = { 
                  _id: customerDoc._id, 
                  name: customerDoc.name 
                };
              } else {
                shipment.customer = { name: 'Unknown' };
              }
            } catch (err) {
              console.error('Error finding customer:', err.message);
              shipment.customer = { name: 'Unknown' };
            }
          } else if (typeof shipment.customer === 'string') {
            shipment.customer = { name: shipment.customer };
          }
        } else {
          shipment.customer = { name: 'Unknown' };
        }
        
        // Get shipment legs
        if (shipment._id) {
          const legs = await ShipmentLeg.find({ shipmentId: shipment._id })
            .sort({ legOrder: 1 })
            .lean();
          
          shipment.legs = legs;
        }
        
        return shipment;
      } catch (err) {
        console.error('Error processing shipment:', err);
        return shipment;
      }
    }));
    
    // Now filter to only include truly overdue shipments
    const filteredOverdue = overdueShipments.filter(shipment => {
      // Check if shipment status is "Arrived"
      if (shipment.shipmentStatus && shipment.shipmentStatus.includes('Arrived')) {
        return true;
      }
      
      // Check scheduled arrival date
      if (shipment.scheduledArrival && new Date(shipment.scheduledArrival) < currentDate) {
        return true;
      }
      
      // Check if the last leg has arrived
      if (shipment.legs && shipment.legs.length > 0) {
        const lastLeg = shipment.legs[shipment.legs.length - 1];
        if (lastLeg.arrivalTime && new Date(lastLeg.arrivalTime) < currentDate) {
          return true;
        }
      }
      
      return false;
    });
    
    console.log(`Filtered to ${filteredOverdue.length} truly overdue shipments`);
    
    res.json(filteredOverdue);
  } catch (err) {
    console.error('Overdue shipments error:', err.message, err.stack);
    res.json([]);
  }
});

module.exports = router; 