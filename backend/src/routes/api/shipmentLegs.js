const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { checkConnectionState } = require('../../mongodb-connect');

const ShipmentLeg = require('../../models/ShipmentLeg');
const Shipment = require('../../models/Shipment');

// @route   GET api/shipmentLegs
// @desc    Get all shipment legs
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const shipmentLegs = await ShipmentLeg.find().sort({ createdAt: -1 });
    res.json(shipmentLegs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipmentLegs/:id
// @desc    Get shipment leg by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid shipment leg ID' });
    }

    const shipmentLeg = await ShipmentLeg.findById(req.params.id);
    
    if (!shipmentLeg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }

    res.json(shipmentLeg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipmentLegs/shipment/:shipment_id
// @desc    Get all legs for a specific shipment
// @access  Private
router.get('/shipment/:shipment_id', auth, async (req, res) => {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.shipment_id)) {
      return res.status(400).json({ msg: 'Invalid shipment ID' });
    }

    const shipmentLegs = await ShipmentLeg.find({ 
      shipment: req.params.shipment_id 
    }).sort({ legOrder: 1 });

    res.json(shipmentLegs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipmentLegs/:shipmentId
// @desc    Get legs for a specific shipment
// @access  Public
router.get('/:shipmentId', async (req, res) => {
  try {
    console.log(`Fetching legs for shipment ID: ${req.params.shipmentId}`);
    
    // Validate shipment ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.shipmentId)) {
      console.log(`Invalid shipment ID format: ${req.params.shipmentId}`);
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    // First try to find legs in the ShipmentLeg collection
    let legs = await ShipmentLeg.find({ 
      shipment: req.params.shipmentId 
    }).sort({ legOrder: 1 });
    
    // If legs are found, return them
    if (legs && legs.length > 0) {
      console.log(`Found ${legs.length} legs for shipment ${req.params.shipmentId} in ShipmentLeg collection`);
      return res.json(legs);
    }
    
    // If no legs found, check if they're embedded in the shipment document
    const shipment = await Shipment.findById(req.params.shipmentId).lean();
    
    if (!shipment) {
      console.log(`No shipment found with ID: ${req.params.shipmentId}`);
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Check if legs exist as embedded documents
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      // If legs are references (ObjectIDs), populate them
      if (typeof shipment.legs[0] === 'string' || shipment.legs[0] instanceof mongoose.Types.ObjectId) {
        // These are references, so we need to fetch the actual legs
        const populatedShipment = await Shipment.findById(req.params.shipmentId)
          .populate('legs')
          .lean();
        
        if (populatedShipment && populatedShipment.legs && populatedShipment.legs.length > 0) {
          console.log(`Found ${populatedShipment.legs.length} referenced legs for shipment ${req.params.shipmentId}`);
          return res.json(populatedShipment.legs);
        }
      } else {
        // These are embedded documents
        console.log(`Found ${shipment.legs.length} embedded legs for shipment ${req.params.shipmentId}`);
        
        // Normalize the legs format and add shipment ID
        const normalizedLegs = shipment.legs.map(leg => ({
          ...leg,
          shipment: req.params.shipmentId
        }));
        
        return res.json(normalizedLegs);
      }
    }
    
    // If no legs are found through either method, create sample legs as a fallback
    console.log(`No legs found for shipment ${req.params.shipmentId}, generating sample legs`);
    
    // Use shipment origin and destination to create a sample leg
    const sampleLegs = [
      {
        _id: new mongoose.Types.ObjectId(),
        from: shipment.origin || 'TLV',
        to: shipment.destination || 'JFK',
        carrier: 'Sample Carrier',
        legOrder: 1,
        departureDate: shipment.departureDate || new Date(),
        arrivalDate: shipment.arrivalDate || new Date(Date.now() + 86400000),
        status: 'Planned',
        legId: `LEG001`,
        shipment: req.params.shipmentId
      }
    ];
    
    // Only log that we're returning sample legs, but don't actually save them
    console.log(`Returning ${sampleLegs.length} sample legs as fallback`);
    return res.json(sampleLegs);
    
  } catch (err) {
    console.error(`Error fetching legs for shipment ${req.params.shipmentId}:`, err.message);
    res.status(500).json({
      msg: 'Server Error', 
      error: err.message
    });
  }
});

// @route   POST api/shipmentLegs
// @desc    Create a new shipment leg
// @access  Private
router.post('/', [
  auth,
  [
    check('shipment', 'Shipment ID is required').not().isEmpty(),
    check('from', 'Origin location is required').not().isEmpty(),
    check('to', 'Destination location is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if shipment exists
    if (!mongoose.Types.ObjectId.isValid(req.body.shipment)) {
      return res.status(400).json({ msg: 'Invalid shipment ID' });
    }

    const shipment = await Shipment.findById(req.body.shipment);
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Create new shipment leg
    const newShipmentLeg = new ShipmentLeg({
      shipment: req.body.shipment,
      legOrder: req.body.legOrder || 0,
      from: req.body.from,
      to: req.body.to,
      carrier: req.body.carrier,
      departureDate: req.body.departureDate,
      arrivalDate: req.body.arrivalDate,
      status: req.body.status || 'Pending',
      trackingNumber: req.body.trackingNumber,
      notes: req.body.notes,
      origin: req.body.origin || req.body.from,
      destination: req.body.destination || req.body.to,
      flightNumber: req.body.flightNumber,
      mawbNumber: req.body.mawbNumber,
      departureTime: req.body.departureTime || req.body.departureDate,
      arrivalTime: req.body.arrivalTime || req.body.arrivalDate,
      changeLog: [{
        timestamp: Date.now(),
        user: req.user.id,
        action: 'create',
        details: 'Created new shipment leg'
      }]
    });

    const shipmentLeg = await newShipmentLeg.save();

    // Add leg to shipment
    shipment.legs.push(shipmentLeg._id);
    await shipment.save();
    
    res.json(shipmentLeg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shipmentLegs/:shipmentId
// @desc    Create a new leg for a shipment
// @access  Public
router.post('/:shipmentId', async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    console.log(`Creating new leg for shipment: ${shipmentId}`);
    
    // Validate shipment ID format
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    // Check if shipment exists
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Parse data from request body
    const legData = {
      shipment: shipmentId,
      from: req.body.from || 'Origin',
      to: req.body.to || 'Destination',
      carrier: req.body.carrier || 'Default Carrier',
      legOrder: req.body.legOrder || 1,
      departureDate: req.body.departureDate || new Date(),
      arrivalDate: req.body.arrivalDate || new Date(Date.now() + 86400000),
      status: req.body.status || 'Planned',
      legId: `LEG${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    };
    
    // Create the new leg
    const newLeg = new ShipmentLeg(legData);
    const savedLeg = await newLeg.save();
    
    // Add leg to shipment's legs array
    if (!shipment.legs) {
      shipment.legs = [];
    }
    shipment.legs.push(savedLeg._id);
    await shipment.save();
    
    console.log(`Leg created successfully with ID: ${savedLeg._id}`);
    res.status(201).json(savedLeg);
    
  } catch (err) {
    console.error('Error creating shipment leg:', err.message);
    res.status(500).json({ 
      msg: 'Server Error',
      error: err.message 
    });
  }
});

// @route   PUT api/shipmentLegs/:id
// @desc    Update a shipment leg
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid shipment leg ID' });
    }

    const shipmentLeg = await ShipmentLeg.findById(req.params.id);

      if (!shipmentLeg) {
        return res.status(404).json({ msg: 'Shipment leg not found' });
      }

    // Fields that can be updated
    const updateFields = [
      'legOrder', 'from', 'to', 'carrier', 'departureDate', 'arrivalDate',
      'status', 'trackingNumber', 'notes', 'origin', 'destination',
      'flightNumber', 'mawbNumber', 'departureTime', 'arrivalTime'
    ];

    // Update fields if provided
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        shipmentLeg[field] = req.body[field];
      }
    });
        
    // Add to changelog
    shipmentLeg.changeLog.push({
      timestamp: Date.now(),
      user: req.user.id,
      action: 'update',
      details: 'Updated shipment leg',
      fields: updateFields
        .filter(field => req.body[field] !== undefined)
        .reduce((obj, field) => {
          obj[field] = req.body[field];
          return obj;
        }, {})
    });

    // Save updated shipment leg
    const updatedShipmentLeg = await shipmentLeg.save();

    res.json(updatedShipmentLeg);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

// @route   DELETE api/shipmentLegs/:id
// @desc    Delete a shipment leg
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid shipment leg ID' });
    }

    const shipmentLeg = await ShipmentLeg.findById(req.params.id);

    if (!shipmentLeg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }

    // Remove leg from shipment
    await Shipment.findByIdAndUpdate(
      shipmentLeg.shipment,
      { $pull: { legs: req.params.id } }
    );
    
    // Delete the shipment leg
    await ShipmentLeg.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Shipment leg removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipment-legs/diagnostic/count
// @desc    Get diagnostic info for shipment legs
// @access  Public
router.get('/diagnostic/count', async (req, res) => {
  try {
    // Check database connection
    const dbConnected = mongoose.connection.readyState === 1;
    console.log('Database connection status:', dbConnected ? 'connected' : 'disconnected');
    
    if (!dbConnected) {
      return res.status(500).json({
        error: 'Database not connected',
        connectionState: mongoose.connection.readyState
      });
    }
    
    // Get counts for all collections
    const legCount = await ShipmentLeg.countDocuments();
    const shipmentCount = await Shipment.countDocuments();
    
    console.log(`Collection counts - Legs: ${legCount}, Shipments: ${shipmentCount}`);
    
    // Get all legs grouped by shipment ID
    const legsByShipment = await ShipmentLeg.aggregate([
      { $group: { _id: "$shipmentId", count: { $sum: 1 } } }
    ]);
    
    // Get all shipment IDs with legs
    const shipmentIds = legsByShipment.map(group => group._id);
    
    // Get info about those shipments
    const shipments = await Shipment.find({ 
      _id: { $in: shipmentIds } 
    }, { _id: 1, serialNumber: 1, legs: 1 }).lean();
    
    // Get shipments that should have legs but don't
    const shipmentsWithoutLegs = await Shipment.find({
      legs: { $exists: true, $size: 0 }
    }, { _id: 1, serialNumber: 1 }).lean();
    
    // Check for orphaned legs (no associated shipment)
    const allShipmentIds = (await Shipment.find({}, { _id: 1 }).lean()).map(s => s._id.toString());
    const orphanedLegCounts = await ShipmentLeg.countDocuments({
      shipmentId: { $nin: allShipmentIds }
    });
    
    console.log('Diagnostic: Found', legCount, 'legs across', shipmentIds.length, 'shipments');
    console.log('Found', shipmentsWithoutLegs.length, 'shipments with empty legs array');
    console.log('Found', orphanedLegCounts, 'orphaned legs');
    
    // Return all diagnostic info
    return res.json({
      database: {
        connected: dbConnected,
        connectionState: mongoose.connection.readyState
      },
      counts: {
        totalLegs: legCount,
        totalShipments: shipmentCount,
        shipmentsWithLegs: shipmentIds.length,
        shipmentsWithoutLegs: shipmentsWithoutLegs.length,
        orphanedLegs: orphanedLegCounts
      },
      legsGrouped: legsByShipment,
      shipments: shipments,
      shipmentsWithoutLegs: shipmentsWithoutLegs
    });
  } catch (err) {
    console.error('Error in leg diagnostic:', err.message, err.stack);
    return res.status(500).json({ 
      error: 'Error running leg diagnostic',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

// @route   GET api/shipment-legs/diagnostic/test/:shipmentId
// @desc    Test adding a sample leg
// @access  Public
router.get('/diagnostic/test/:shipmentId', async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    console.log('Running diagnostic test for shipment:', shipmentId);
    
    // Check database connection
    const dbConnected = mongoose.connection.readyState === 1;
    if (!dbConnected) {
      return res.status(500).json({
        error: 'Database not connected',
        connectionState: mongoose.connection.readyState
      });
    }
    
    // Check if shipment exists
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ 
        error: 'Shipment not found',
        shipmentId
      });
    }
    
    // Try to create a test leg
    const testLeg = new ShipmentLeg({
      shipmentId: shipmentId,
      legOrder: 999, // Special test leg order
      origin: 'TEST_ORIGIN',
      destination: 'TEST_DESTINATION',
      flightNumber: 'TEST123',
      mawbNumber: 'TEST-MAWB',
      departureTime: new Date(),
      arrivalTime: new Date(Date.now() + 3600000), // 1 hour later
      status: 'Pending',
      notes: 'This is a diagnostic test leg'
    });
    
    console.log('Created test leg object:', JSON.stringify(testLeg));
    
    // Check if legs array exists in shipment
    if (!shipment.legs) {
      shipment.legs = [];
      console.log('Legs array did not exist, created empty array');
    }
    
    // Save the test leg
    const savedLeg = await testLeg.save();
    console.log('Test leg saved with ID:', savedLeg._id);
    
    // Add leg reference to shipment
    shipment.legs.push(savedLeg._id);
    await shipment.save();
    console.log('Added test leg to shipment');
    
    return res.json({
      success: true,
      message: 'Diagnostic test leg created successfully',
      shipment: {
        id: shipment._id,
        serialNumber: shipment.serialNumber,
        legCount: shipment.legs.length
      },
      testLeg: savedLeg
    });
  } catch (err) {
    console.error('Error in leg diagnostic test:', err.message, err.stack);
    return res.status(500).json({ 
      success: false,
      error: 'Error creating test leg',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

module.exports = router; 