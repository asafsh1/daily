const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const ShipmentLeg = require('../../models/ShipmentLeg');
const Shipment = require('../../models/Shipment');

// @route   GET api/shipment-legs/:shipmentId
// @desc    Get all legs for a shipment
// @access  Private
router.get('/:shipmentId', auth, async (req, res) => {
  try {
    // Check for valid database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      return res.status(503).json({
        error: 'Database connection is not ready',
        legs: []
      });
    }
    
    // Limit the number of returned legs to prevent resource exhaustion
    const legs = await ShipmentLeg.find({ shipment: req.params.shipmentId })
      .sort({ legOrder: 1 })
      .limit(20); // Limit to 20 legs per shipment
    
    console.log(`Found ${legs.length} legs for shipment ${req.params.shipmentId}`);
    res.json(legs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      error: 'Server Error',
      message: err.message,
      legs: []
    });
  }
});

// @route   POST api/shipment-legs
// @desc    Add a leg to a shipment
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('shipment', 'Shipment is required').not().isEmpty(),
      check('from', 'Origin location is required').not().isEmpty(),
      check('to', 'Destination location is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Extract fields, supporting both old and new field names
      const {
        shipment,
        legOrder,
        // Support both new and old field names
        from, origin,
        to, destination,
        carrier, flightNumber, airline,
        departureDate, departureTime,
        arrivalDate, arrivalTime,
        status,
        trackingNumber, awbNumber, mawbNumber,
        notes,
        legId
      } = req.body;

      // Find the associated shipment
      const shipmentDoc = await Shipment.findById(shipment);
      if (!shipmentDoc) {
        return res.status(404).json({ msg: 'Shipment not found' });
      }

      // Create leg with appropriate field mapping
      const newLeg = new ShipmentLeg({
        shipment,
        legOrder: legOrder || 0,
        // Use new field names but fall back to old names if needed
        from: from || origin || '',
        to: to || destination || '',
        carrier: carrier || flightNumber || airline || '',
        departureDate: departureDate || departureTime || null,
        arrivalDate: arrivalDate || arrivalTime || null,
        status: status || 'pending',
        trackingNumber: trackingNumber || awbNumber || mawbNumber || '',
        notes,
        legId
      });

      const leg = await newLeg.save();

      // Add to the shipment's change log
      shipmentDoc.changeLog.push({
        timestamp: new Date(),
        user: req.user.id,
        action: 'added-leg',
        details: `Added leg from ${newLeg.from} to ${newLeg.to}`
      });
      await shipmentDoc.save();

      res.json(leg);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/shipment-legs/:id
// @desc    Update a leg
// @access  Private
router.put('/:id', auth, async (req, res) => {
  // Extract fields, supporting both old and new field names
  const {
    legOrder,
    // Support both new and old field names
    from, origin,
    to, destination,
    carrier, flightNumber, airline,
    departureDate, departureTime,
    arrivalDate, arrivalTime,
    status,
    trackingNumber, awbNumber, mawbNumber,
    notes
  } = req.body;

  // Build leg object with appropriate field mapping
  const legFields = {};
  if (legOrder !== undefined) legFields.legOrder = legOrder;
  if (from || origin) legFields.from = from || origin;
  if (to || destination) legFields.to = to || destination;
  if (carrier || flightNumber || airline) legFields.carrier = carrier || flightNumber || airline;
  if (departureDate || departureTime) legFields.departureDate = departureDate || departureTime;
  if (arrivalDate || arrivalTime) legFields.arrivalDate = arrivalDate || arrivalTime;
  if (status) legFields.status = status;
  if (trackingNumber !== undefined || awbNumber !== undefined || mawbNumber !== undefined) 
    legFields.trackingNumber = trackingNumber || awbNumber || mawbNumber;
  if (notes !== undefined) legFields.notes = notes;

  try {
    let leg = await ShipmentLeg.findById(req.params.id);

    if (!leg) {
      return res.status(404).json({ msg: 'Leg not found' });
    }

    // Update the leg
    leg = await ShipmentLeg.findByIdAndUpdate(
      req.params.id,
      { $set: legFields },
      { new: true }
    );

    // Add to the shipment's change log
    const shipment = await Shipment.findById(leg.shipment);
    if (shipment) {
      shipment.changeLog.push({
        timestamp: new Date(),
        user: req.user.id,
        action: 'updated-leg',
        details: `Updated leg from ${leg.from} to ${leg.to}`
      });
      await shipment.save();
    }

    res.json(leg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/shipment-legs/:id
// @desc    Delete a leg
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const leg = await ShipmentLeg.findById(req.params.id);

    if (!leg) {
      return res.status(404).json({ msg: 'Leg not found' });
    }

    // Store leg details before deletion for the change log
    const legDetails = {
      from: leg.from,
      to: leg.to,
      shipmentId: leg.shipment
    };

    await leg.remove();

    // Add to the shipment's change log
    const shipment = await Shipment.findById(legDetails.shipmentId);
    if (shipment) {
      shipment.changeLog.push({
        timestamp: new Date(),
        user: req.user.id,
        action: 'deleted-leg',
        details: `Deleted leg from ${legDetails.from} to ${legDetails.to}`
      });
      await shipment.save();
    }

    res.json({ msg: 'Leg removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/shipment-legs/reassign/:tempId/:shipmentId
// @desc    Reassign legs from a temporary ID to a permanent shipment ID
// @access  Private
router.put('/reassign/:tempId/:shipmentId', auth, async (req, res) => {
  try {
    const { tempId, shipmentId } = req.params;
    
    // Verify the target shipment exists
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ msg: 'Target shipment not found' });
    }
    
    // Find all legs with the temp ID and update them
    const legs = await ShipmentLeg.updateMany(
      { shipment: tempId },
      { $set: { shipment: shipmentId } }
    );
    
    res.json({ msg: 'Legs reassigned successfully', count: legs.nModified });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 