const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');

// @route   GET api/shipments
// @desc    Get all shipments
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('Processing shipments request');
    
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      return res.status(503).json({
        error: 'Database connection is not ready',
        status: mongoose.connection.readyState,
        shipments: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 1
        }
      });
    }
    
    try {
      console.log('Fetching all shipments');
      const shipments = await Shipment.find()
        .sort({ dateAdded: -1 })
        .lean();
      
      if (!shipments) {
        console.error('No shipments returned from database');
        return res.status(500).json({
          error: 'Failed to retrieve shipments', 
          shipments: []
        });
      }
      
      console.log(`Found ${shipments.length} shipments`);
      
      // Get shipment legs for all shipments
      const allLegs = await ShipmentLeg.find()
        .sort({ legOrder: 1 })
        .lean();
      
      console.log(`Found ${allLegs.length} total legs`);
      
      // Safely process legs with extensive error handling
      const legsByShipment = {};
      
      // Process legs one by one
      for (const leg of allLegs) {
        try {
          // Skip invalid legs
          if (!leg) {
            console.log("Found null leg in database, skipping");
            continue;
          }
          
          // Handle missing shipment field
          if (!leg.shipment) {
            console.log("Found leg without shipment reference:", leg._id);
            continue;
          }
          
          // Convert ObjectId to string safely
          let shipmentId;
          try {
            shipmentId = leg.shipment.toString();
          } catch (err) {
            console.error("Error converting leg.shipment to string:", err.message, "leg:", leg);
            continue;
          }
          
          if (!legsByShipment[shipmentId]) {
            legsByShipment[shipmentId] = [];
          }
          
          legsByShipment[shipmentId].push(leg);
        } catch (err) {
          console.error("Error processing leg:", err.message, "leg:", leg);
        }
      }
      
      // Process each shipment to format properly
      const processedShipments = [];
      for (const shipment of shipments) {
        try {
          if (!shipment) {
            console.warn('Null shipment found in database results');
            continue;
          }
          
          let shipmentId;
          try {
            shipmentId = shipment._id.toString();
          } catch (err) {
            console.error("Error converting shipment._id to string:", err.message);
            shipmentId = "unknown";
            continue;
          }
          
          const shipmentLegs = legsByShipment[shipmentId] || [];
          
          // Calculate departure and arrival times
          let departureTime = null;
          let arrivalTime = null;
          
          if (shipmentLegs.length === 1) {
            departureTime = shipmentLegs[0].departureTime;
            arrivalTime = shipmentLegs[0].arrivalTime;
          } else if (shipmentLegs.length > 1) {
            departureTime = shipmentLegs[0].departureTime;
            arrivalTime = shipmentLegs[shipmentLegs.length - 1].arrivalTime;
          }
          
          // Process customer field to handle both string and ObjectId references
          let customerDisplay = shipment.customer || { name: 'Unknown' };
          if (typeof shipment.customer === 'string') {
            customerDisplay = { name: shipment.customer };
          } 
          
          processedShipments.push({
            ...shipment,
            legs: shipmentLegs,
            customer: customerDisplay,
            scheduledDeparture: departureTime,
            scheduledArrival: arrivalTime
          });
        } catch (err) {
          console.error('Error processing shipment:', err.message);
        }
      }
      
      // Calculate total
      const total = processedShipments.length;
      
      console.log(`Returning ${processedShipments.length} processed shipments`);
      
      return res.json({
        shipments: processedShipments,
        pagination: {
          total,
          page: 1,
          pages: 1
        }
      });
    } catch (queryErr) {
      console.error('Error in main query:', queryErr.message);
      throw queryErr;
    }
  } catch (err) {
    console.error('Error in shipments request:', err.message, err.stack);
    return res.status(500).json({
      error: 'Error retrieving shipments',
      message: err.message,
      shipments: []
    });
  }
});

// @route   GET api/shipments/:id
// @desc    Get shipment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready');
      return res.status(503).json({
        error: 'Database connection is not ready'
      });
    }
    
    const shipment = await Shipment.findById(req.params.id).lean();
    
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Find legs for this shipment
    try {
      const legs = await ShipmentLeg.find({ shipment: req.params.id })
        .sort({ legOrder: 1 })
        .lean();
      
      shipment.legs = legs;
    } catch (err) {
      console.error('Error fetching legs:', err.message);
      shipment.legs = [];
    }
    
    // Process customer field
    if (typeof shipment.customer === 'string') {
      shipment.customer = { name: shipment.customer };
    }
    
    res.json(shipment);
  } catch (err) {
    console.error('Error getting shipment by ID:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET api/shipments/:id/legs
// @desc    Get all legs for a specific shipment
// @access  Public
router.get('/:id/legs', async (req, res) => {
  try {
    console.log(`Fetching legs for shipment ID: ${req.params.id}`);
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready');
      return res.status(503).json({
        error: 'Database connection is not ready',
        legs: []
      });
    }
    
    // Find all legs for this shipment
    const legs = await ShipmentLeg.find({ shipment: req.params.id })
      .sort({ legOrder: 1 });
    
    console.log(`Found ${legs.length} legs for shipment ${req.params.id}`);
    
    res.json(legs);
  } catch (err) {
    console.error('Error fetching shipment legs:', err.message);
    res.status(500).json({ 
      error: 'Server error when fetching shipment legs',
      message: err.message
    });
  }
});

module.exports = router;
