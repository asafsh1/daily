const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const ShipmentLeg = require('../../models/ShipmentLeg');
const Shipment = require('../../models/Shipment');

// @route    GET api/shipment-legs/:shipmentId
// @desc     Get all legs for a shipment
// @access   Public
router.get('/:shipmentId', async (req, res) => {
  try {
    console.log('Fetching legs for shipment:', req.params.shipmentId);
    const shipmentLegs = await ShipmentLeg.find({ 
      shipmentId: req.params.shipmentId 
    }).sort({ legOrder: 1 });
    
    console.log(`Found ${shipmentLegs.length} legs for shipment ${req.params.shipmentId}`);
    res.json(shipmentLegs);
  } catch (err) {
    console.error('Error fetching shipment legs:', err.message);
    res.status(500).send('Server Error');
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
      check('arrivalTime', 'Arrival time is required').isISO8601(),
      check('legOrder', 'Leg order is required').isInt({ min: 1, max: 4 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if shipment exists
      const shipment = await Shipment.findById(req.params.shipmentId);
      if (!shipment) {
        return res.status(404).json({ msg: 'Shipment not found' });
      }

      // Check if a leg with the same order already exists
      const existingLeg = await ShipmentLeg.findOne({
        shipmentId: req.params.shipmentId,
        legOrder: req.body.legOrder
      });

      if (existingLeg) {
        return res.status(400).json({ 
          errors: [{ msg: `Leg ${req.body.legOrder} already exists for this shipment` }] 
        });
      }

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

      await shipmentLeg.save();

      // Update the shipment routing
      await updateShipmentRouting(req.params.shipmentId);
      
      // Update the shipment status based on legs
      await updateShipmentStatus(req.params.shipmentId);

      res.json(shipmentLeg);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
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
    // Check if leg exists
    const shipmentLeg = await ShipmentLeg.findOne({
      _id: req.params.legId,
      shipmentId: req.params.shipmentId
    });

    if (!shipmentLeg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }

    await shipmentLeg.remove();

    // Update the shipment routing
    await updateShipmentRouting(req.params.shipmentId);
    
    // Update the shipment status based on legs
    await updateShipmentStatus(req.params.shipmentId);

    res.json({ msg: 'Shipment leg removed' });
  } catch (err) {
    console.error(err.message);
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

module.exports = router; 