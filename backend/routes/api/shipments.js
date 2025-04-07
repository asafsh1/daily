const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');

const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');
const Customer = require('../../models/Customer');

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

// @route   GET api/shipments/repair-legs/:id
// @desc    Special endpoint to fix legs for a shipment
// @access  Public
router.get('/repair-legs/:id', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    console.log(`[REPAIR] Repairing legs for shipment: ${shipmentId}`);
    
    // Check for valid ObjectId format
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid shipment ID format' 
      });
    }
    
    // 1. Find the shipment
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Shipment not found' 
      });
    }
    
    // 2. Get all legs from shipmentLeg collection
    const allLegs = await mongoose.model('shipmentLeg').find({ 
      shipment: shipmentId 
    }).sort({ legOrder: 1 });
    
    console.log(`[REPAIR] Found ${allLegs.length} independent legs for shipment ${shipmentId}`);
    
    // 3. Record initial state for reporting
    const initialLegsLength = shipment.legs ? shipment.legs.length : 0;
    
    // 4. Reset shipment legs array and add all legs found
    shipment.legs = allLegs.map(leg => leg._id);
    
    // 5. Update the shipment with the correct legs
    await shipment.save();
    
    console.log(`[REPAIR] Updated shipment ${shipmentId} with ${shipment.legs.length} legs (was ${initialLegsLength})`);
    
    // 6. Get the updated shipment with populated legs
    const updatedShipment = await Shipment.findById(shipmentId)
      .populate({
        path: 'legs',
        model: 'shipmentLeg',
        options: { sort: { legOrder: 1 } }
      });
    
    // 7. Send response with complete repair information
    res.json({
      success: true,
      message: `Repaired shipment legs. Found and linked ${allLegs.length} legs.`,
      shipment: {
        _id: updatedShipment._id,
        serialNumber: updatedShipment.serialNumber || 'N/A',
        origin: updatedShipment.origin,
        destination: updatedShipment.destination
      },
      legs: {
        before: initialLegsLength,
        after: shipment.legs.length,
        list: updatedShipment.legs.map(leg => ({
          _id: leg._id,
          legOrder: leg.legOrder,
          from: leg.from || leg.origin || 'Unknown',
          to: leg.to || leg.destination || 'Unknown'
        }))
      }
    });
  } catch (err) {
    console.error(`[REPAIR] Error repairing shipment legs: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message
    });
  }
});

// @route   GET api/shipments/:id
// @desc    Get shipment by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // First check for valid ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    // Try to find the shipment directly
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    // Populate customer data if it's an ObjectId reference
    if (shipment.customer && mongoose.Types.ObjectId.isValid(shipment.customer)) {
      const populatedShipment = await Shipment.findById(req.params.id)
        .populate('customer', 'name email')
        .lean();
        
      return res.json(populatedShipment);
    }

    // Add legs to the response if the shipment has them
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      try {
        // Find all legs for this shipment
        const shipmentLegs = await ShipmentLeg.find({ 
          shipment: shipment._id 
        }).sort({ legOrder: 1 });
        
        // If we have legs in both places, use the newer leg collection data
        if (shipmentLegs && shipmentLegs.length > 0) {
          // Return the shipment with leg data directly
          const shipmentWithLegs = shipment.toObject();
          shipmentWithLegs.legs = shipmentLegs;
          return res.json(shipmentWithLegs);
        }
      } catch (err) {
        console.error('Error fetching legs for shipment:', err);
        // Continue with normal shipment return if leg fetch fails
      }
    }

    // Return the standard shipment data
    res.json(shipment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipments/:id/legs
// @desc    Get legs for a specific shipment
// @access  Public
router.get('/:id/legs', async (req, res) => {
  try {
    console.log(`Fetching legs for shipment ID: ${req.params.id}`);
    
    // First try to find standalone legs in the ShipmentLeg collection
    const legs = await ShipmentLeg.find({ shipment: req.params.id }).sort({ legOrder: 1 });
    
    if (legs && legs.length > 0) {
      console.log(`Found ${legs.length} legs for shipment ${req.params.id} in ShipmentLeg collection`);
      return res.json(legs);
    }
    
    // If no standalone legs found, try to get embedded legs from the shipment
    const shipment = await Shipment.findById(req.params.id);
    
    if (!shipment) {
      console.log(`No shipment found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Check different possible leg structures
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      console.log(`Found ${shipment.legs.length} legs embedded in the shipment.legs field`);
      
      // Add the shipment ID to each leg to normalize the structure
      const normalizedLegs = shipment.legs.map(leg => ({
        ...leg,
        shipment: req.params.id
      }));
      
      return res.json(normalizedLegs);
    }
    
    console.log(`No legs found for shipment ${req.params.id}`);
    return res.json([]);
    
  } catch (err) {
    console.error(`Error fetching legs for shipment ${req.params.id}:`, err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
