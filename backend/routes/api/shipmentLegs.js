const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const ShipmentLeg = require('../../models/ShipmentLeg');
const Shipment = require('../../models/Shipment');

// @route    GET api/shipment-legs/:shipmentId
// @desc     Get all legs for a shipment
// @access   Public
router.get('/:shipmentId', async (req, res) => {
  try {
    console.log('Fetching legs for shipment:', req.params.shipmentId);
    
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.shipmentId)) {
      console.log('Invalid shipment ID format:', req.params.shipmentId);
      return res.json([]);  // Return empty array instead of error for invalid IDs
    }
    
    const shipmentLegs = await ShipmentLeg.find({ 
      shipmentId: req.params.shipmentId 
    }).sort({ legOrder: 1 });
    
    console.log(`Found ${shipmentLegs.length} legs for shipment ${req.params.shipmentId}`);
    res.json(shipmentLegs);
  } catch (err) {
    console.error('Error fetching shipment legs:', err.message);
    res.status(500).json({ 
      msg: 'Error fetching legs', 
      error: err.message 
    });
  }
});

// @route    GET api/shipment-legs/:shipmentId/:legId
// @desc     Get specific leg of a shipment
// @access   Public
router.get('/:shipmentId/:legId', async (req, res) => {
  try {
    const shipmentLeg = await ShipmentLeg.findOne({
      _id: req.params.legId,
      shipmentId: req.params.shipmentId
    });
    
    if (!shipmentLeg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }

    res.json(shipmentLeg);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    POST api/shipment-legs/:shipmentId
// @desc     Add a leg to a shipment
// @access   Public
router.post(
  '/:shipmentId',
  [
    [
      check('origin', 'Origin is required').not().isEmpty(),
      check('destination', 'Destination is required').not().isEmpty(),
      check('flightNumber', 'Flight number is required').not().isEmpty(),
      check('mawbNumber', 'MAWB number is required').not().isEmpty(),
      check('departureTime', 'Departure time is required').isISO8601(),
      check('arrivalTime', 'Arrival time is required').isISO8601()
    ]
  ],
  async (req, res) => {
    try {
      console.log('-- Starting shipment leg creation --');
      console.log('Shipment ID:', req.params.shipmentId);
      console.log('Request body:', JSON.stringify(req.body));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if ID is valid
      if (!mongoose.Types.ObjectId.isValid(req.params.shipmentId)) {
        console.log('Invalid shipment ID format:', req.params.shipmentId);
        return res.status(400).json({ 
          errors: [{ msg: 'Invalid shipment ID format' }]
        });
      }
      
      // Check if shipment exists
      let shipment;
      try {
        shipment = await Shipment.findById(req.params.shipmentId);
        console.log('Found shipment:', shipment ? 'yes' : 'no');
      } catch (err) {
        console.error('Error finding shipment:', err.message);
        return res.status(500).json({ 
          msg: 'Error finding shipment', 
          error: err.message 
        });
      }
      
      if (!shipment) {
        console.log('Shipment not found with ID:', req.params.shipmentId);
        return res.status(404).json({ msg: 'Shipment not found' });
      }

      // Initialize legs array if not present
      if (!shipment.legs) {
        console.log('Creating legs array - it was not defined');
        shipment.legs = [];
        await shipment.save();
      }

      // Auto-assign legOrder if not specified
      let legOrder = req.body.legOrder;
      if (!legOrder) {
        // Find the max leg order and add 1
        const existingLegs = await ShipmentLeg.find({ shipmentId: req.params.shipmentId })
          .sort({ legOrder: -1 })
          .limit(1);
          
        legOrder = existingLegs.length > 0 ? existingLegs[0].legOrder + 1 : 1;
        console.log('Auto-assigned leg order:', legOrder);
      } else {
        // Check if a leg with the same order already exists
        const existingLeg = await ShipmentLeg.findOne({
          shipmentId: req.params.shipmentId,
          legOrder: req.body.legOrder
        });

        if (existingLeg) {
          console.log('Leg with order', req.body.legOrder, 'already exists');
          return res.status(400).json({ 
            errors: [{ msg: `Leg ${req.body.legOrder} already exists for this shipment` }] 
          });
        }
      }

      // Extract leg data from request
      const {
        origin,
        destination,
        flightNumber,
        mawbNumber,
        departureTime,
        arrivalTime,
        status,
        notes
      } = req.body;

      console.log('Creating new ShipmentLeg document with:');
      console.log('- shipmentId:', req.params.shipmentId);
      console.log('- legOrder:', legOrder);
      console.log('- origin:', origin);
      console.log('- destination:', destination);
      console.log('- departure:', departureTime);
      console.log('- arrival:', arrivalTime);

      // Create new leg document
      const shipmentLeg = new ShipmentLeg({
        shipmentId: req.params.shipmentId,
        legOrder,
        origin,
        destination,
        flightNumber,
        mawbNumber,
        departureTime,
        arrivalTime,
        status: status || 'Pending',
        notes
      });
      
      let savedLeg;
      try {
        savedLeg = await shipmentLeg.save();
        console.log('Successfully saved leg with ID:', savedLeg._id);
      } catch (err) {
        console.error('Error saving shipment leg:', err.message, err.stack);
        return res.status(500).json({ 
          msg: 'Error saving shipment leg', 
          error: err.message 
        });
      }
      
      // Add the leg to the shipment's legs array if not already there
      if (!shipment.legs.includes(savedLeg._id)) {
        console.log('Adding leg ID to shipment legs array');
        shipment.legs.push(savedLeg._id);
        
        try {
          await shipment.save();
          console.log('Updated shipment with new leg reference');
        } catch (err) {
          console.error('Error updating shipment with leg reference:', err.message);
          // Continue even if this fails - we've already saved the leg
        }
      } else {
        console.log('Leg already in shipment legs array');
      }

      // Update the shipment routing
      try {
        await updateShipmentRouting(req.params.shipmentId);
      } catch (err) {
        console.error('Error updating shipment routing:', err.message);
        // Continue even if this fails
      }
      
      // Update the shipment status based on legs
      try {
        await updateShipmentStatus(req.params.shipmentId);
      } catch (err) {
        console.error('Error updating shipment status:', err.message);
        // Continue even if this fails
      }

      console.log('Shipment leg creation completed successfully');
      res.json(savedLeg);
    } catch (err) {
      console.error('Error creating shipment leg:', err.message, err.stack);
      res.status(500).json({
        msg: 'Server Error', 
        error: err.message
      });
    }
  }
);

// @route    PUT api/shipment-legs/:shipmentId/:legId
// @desc     Update a shipment leg
// @access   Public
router.put(
  '/:shipmentId/:legId',
  async (req, res) => {
    try {
      // Check if leg exists
      let shipmentLeg = await ShipmentLeg.findOne({
        _id: req.params.legId,
        shipmentId: req.params.shipmentId
      });

      if (!shipmentLeg) {
        return res.status(404).json({ msg: 'Shipment leg not found' });
      }

      // If trying to change the leg order, check for conflicts
      if (req.body.legOrder && req.body.legOrder !== shipmentLeg.legOrder) {
        const conflictingLeg = await ShipmentLeg.findOne({
          shipmentId: req.params.shipmentId,
          legOrder: req.body.legOrder
        });

        if (conflictingLeg) {
          return res.status(400).json({ 
            errors: [{ msg: `Leg ${req.body.legOrder} already exists for this shipment` }] 
          });
        }
      }

      // Build leg object with changed fields
      const {
        legOrder,
        origin,
        destination,
        flightNumber,
        mawbNumber,
        departureTime,
        arrivalTime,
        status,
        notes
      } = req.body;

      const legFields = {};
      if (legOrder) legFields.legOrder = legOrder;
      if (origin) legFields.origin = origin;
      if (destination) legFields.destination = destination;
      if (flightNumber) legFields.flightNumber = flightNumber;
      if (mawbNumber) legFields.mawbNumber = mawbNumber;
      if (departureTime) legFields.departureTime = departureTime;
      if (arrivalTime) legFields.arrivalTime = arrivalTime;
      if (status) legFields.status = status;
      if (notes !== undefined) legFields.notes = notes;
      legFields.updatedAt = Date.now();

      // Update
      shipmentLeg = await ShipmentLeg.findByIdAndUpdate(
        req.params.legId,
        { $set: legFields },
        { new: true }
      );

      // Update the shipment routing
      await updateShipmentRouting(req.params.shipmentId);
      
      // Update the shipment status based on legs
      await updateShipmentStatus(req.params.shipmentId);

      res.json(shipmentLeg);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Shipment leg not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/shipment-legs/:shipmentId/:legId
// @desc     Delete a shipment leg
// @access   Public
router.delete('/:shipmentId/:legId', async (req, res) => {
  try {
    console.log('Deleting leg:', req.params.legId, 'from shipment:', req.params.shipmentId);
    
    // Check if leg exists
    const shipmentLeg = await ShipmentLeg.findOne({
      _id: req.params.legId,
      shipmentId: req.params.shipmentId
    });

    if (!shipmentLeg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }

    // Remove the leg
    await ShipmentLeg.deleteOne({ _id: req.params.legId });
    console.log('Deleted leg from ShipmentLeg collection');
    
    // Remove the leg reference from the shipment
    await Shipment.findByIdAndUpdate(
      req.params.shipmentId,
      { $pull: { legs: req.params.legId } }
    );
    console.log('Removed leg reference from shipment');

    // Update the shipment routing
    await updateShipmentRouting(req.params.shipmentId);
    
    // Update the shipment status based on legs
    await updateShipmentStatus(req.params.shipmentId);

    res.json({ msg: 'Shipment leg removed' });
  } catch (err) {
    console.error('Error deleting shipment leg:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/shipmentLegs/reassign/:tempId/:shipmentId
// @desc    Reassign legs from temporary ID to real shipment ID
// @access  Public
router.put('/reassign/:tempId/:shipmentId', async (req, res) => {
  try {
    const { tempId, shipmentId } = req.params;
    
    // Find all legs with the temporary shipmentId
    const legs = await ShipmentLeg.find({ shipmentId: tempId });
    
    if (legs.length === 0) {
      return res.status(404).json({ msg: 'No legs found with temporary ID' });
    }
    
    // Update all legs with the new shipmentId
    await ShipmentLeg.updateMany(
      { shipmentId: tempId },
      { $set: { shipmentId: shipmentId } }
    );
    
    // Update the shipment to include references to these legs
    const legIds = legs.map(leg => leg._id);
    await Shipment.findByIdAndUpdate(
      shipmentId,
      { $push: { legs: { $each: legIds } } }
    );
    
    res.json({ msg: `${legs.length} legs reassigned to shipment ${shipmentId}` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function to update shipment routing based on legs
async function updateShipmentRouting(shipmentId) {
  try {
    // Get all legs for this shipment in order
    const legs = await ShipmentLeg.find({ shipmentId }).sort({ legOrder: 1 });
    
    if (legs.length === 0) {
      return;
    }

    // Create routing string from leg origins and the final destination
    const places = legs.map(leg => leg.origin);
    places.push(legs[legs.length - 1].destination); // Add the final destination
    
    const routingString = places.join('-');
    
    // Update the shipment with the new routing
    await Shipment.findByIdAndUpdate(shipmentId, { routing: routingString });
  } catch (err) {
    console.error('Error updating shipment routing:', err);
  }
}

// Helper function to update shipment status based on leg statuses
async function updateShipmentStatus(shipmentId) {
  try {
    // Get all legs for this shipment in order
    const legs = await ShipmentLeg.find({ shipmentId }).sort({ legOrder: 1 });
    
    if (legs.length === 0) {
      return;
    }

    // Determine the shipment status based on the legs
    let shipmentStatus = 'Pending';
    const lastLeg = legs[legs.length - 1];
    const firstLeg = legs[0];
    
    // If the last leg is arrived, the whole shipment is arrived
    if (lastLeg.status === 'Arrived') {
      shipmentStatus = 'Arrived';
    }
    // If any leg is in transit, the shipment is in transit
    else if (legs.some(leg => leg.status === 'In Transit')) {
      // Check which leg is in transit to provide more specific status
      const inTransitLeg = legs.find(leg => leg.status === 'In Transit');
      shipmentStatus = `In Transit (Leg ${inTransitLeg.legOrder})`;
    }
    // If any leg is delayed, the shipment is delayed
    else if (legs.some(leg => leg.status === 'Delayed')) {
      const delayedLeg = legs.find(leg => leg.status === 'Delayed');
      shipmentStatus = `Delayed (Leg ${delayedLeg.legOrder})`;
    }
    // If any leg is canceled, the shipment is canceled
    else if (legs.some(leg => leg.status === 'Canceled')) {
      shipmentStatus = 'Canceled';
    }
    
    // Update the shipment status
    await Shipment.findByIdAndUpdate(shipmentId, { shipmentStatus });
    
    console.log(`Updated shipment ${shipmentId} status to ${shipmentStatus}`);
  } catch (err) {
    console.error('Error updating shipment status:', err);
  }
}

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