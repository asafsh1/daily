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
// @desc     Add a new leg to a shipment
// @access   Public
router.post('/:shipmentId', async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    console.log(`Adding leg to shipment ${shipmentId}`, req.body);
    
    // Check if shipment exists
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ errors: [{ msg: 'Shipment not found' }] });
    }
    
    // Find highest leg order for this shipment
    const highestOrderLeg = await ShipmentLeg.findOne({ shipmentId })
      .sort({ legOrder: -1 })
      .limit(1);
      
    // Determine the leg order
    let legOrder = req.body.legOrder;
    if (!legOrder) {
      legOrder = highestOrderLeg ? highestOrderLeg.legOrder + 1 : 1;
    }

    // Create the new leg
    const legData = {
      ...req.body,
      shipmentId,
      legOrder
    };
    
    const leg = new ShipmentLeg(legData);
    await leg.save();
    
    // Add leg to shipment's legs array if not already there
    if (!shipment.legs.includes(leg._id)) {
      shipment.legs.push(leg._id);
    }
    
    // Update shipment status based on legs
    await updateShipmentStatusFromLegs(shipmentId);
    
    // Save shipment
    await shipment.save();
    
    res.json(leg);
  } catch (err) {
    console.error('Error adding shipment leg:', err.message);
    res.status(500).json({ errors: [{ msg: 'Server error adding shipment leg' }] });
  }
});

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
      await updateShipmentStatusFromLegs(req.params.shipmentId);

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
    await updateShipmentStatusFromLegs(req.params.shipmentId);

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

// Helper function to update shipment status based on legs
async function updateShipmentStatusFromLegs(shipmentId) {
  try {
    // Find all legs for this shipment, sorted by leg order
    const legs = await ShipmentLeg.find({ shipmentId }).sort({ legOrder: 1 });
    
    // Get the shipment
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      console.error(`Shipment ${shipmentId} not found for status update`);
      return;
    }
    
    // Determine status based on legs
    let newStatus = 'Pending';
    
    if (legs.length === 0) {
      newStatus = 'Pending';
    } else {
      // Check if all legs have arrived
      const allLegsArrived = legs.every(leg => leg.status === 'Arrived');
      
      // Check if any leg is in transit
      const anyLegInTransit = legs.some(leg => leg.status === 'In Transit');
      
      // Check if any leg is delayed
      const anyLegDelayed = legs.some(leg => leg.status === 'Delayed');
      
      if (allLegsArrived) {
        newStatus = 'Arrived';
      } else if (anyLegDelayed) {
        // Find the first delayed leg
        const delayedLeg = legs.find(leg => leg.status === 'Delayed');
        newStatus = `Delayed Leg${delayedLeg.legOrder} ${delayedLeg.origin}-${delayedLeg.destination}`;
      } else if (anyLegInTransit) {
        // Find the first leg in transit
        const transitLeg = legs.find(leg => leg.status === 'In Transit');
        newStatus = `In Transit Leg${transitLeg.legOrder} ${transitLeg.origin}-${transitLeg.destination}`;
      } else {
        // If no specific status found but there are legs, find the first non-arrived leg
        const activeLegIndex = legs.findIndex(leg => leg.status !== 'Arrived');
        if (activeLegIndex !== -1) {
          const activeLeg = legs[activeLegIndex];
          newStatus = `${activeLeg.status || 'Pending'} Leg${activeLeg.legOrder} ${activeLeg.origin}-${activeLeg.destination}`;
        }
      }
    }
    
    // Update shipment status
    shipment.shipmentStatus = newStatus;
    await shipment.save();
    
    console.log(`Updated shipment ${shipmentId} status to ${newStatus}`);
  } catch (err) {
    console.error('Error updating shipment status from legs:', err.message);
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