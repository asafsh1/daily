const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const ShipmentLeg = require('../../models/ShipmentLeg');
const Shipment = require('../../models/Shipment');

// @route    GET api/shipment-legs/:shipmentId
// @desc     Get all legs for a shipment
// @access   Private
router.get('/:shipmentId', auth, async (req, res) => {
  try {
    const shipmentLegs = await ShipmentLeg.find({ 
      shipmentId: req.params.shipmentId 
    }).sort({ legOrder: 1 });
    
    res.json(shipmentLegs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/shipment-legs/:shipmentId/:legId
// @desc     Get specific leg of a shipment
// @access   Private
router.get('/:shipmentId/:legId', auth, async (req, res) => {
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
// @access   Private
router.post(
  '/:shipmentId',
  [
    auth,
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

      res.json(shipmentLeg);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/shipment-legs/:shipmentId/:legId
// @desc     Update a shipment leg
// @access   Private
router.put(
  '/:shipmentId/:legId',
  auth,
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
// @access   Private
router.delete('/:shipmentId/:legId', auth, async (req, res) => {
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

    res.json({ msg: 'Shipment leg removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }
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

module.exports = router; 