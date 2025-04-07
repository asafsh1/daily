const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const ShipmentLeg = require('../../models/ShipmentLeg');
const Shipment = require('../../models/Shipment');

// Function to load sample data if database is not available
const getSampleShipments = () => {
  try {
    const sampleDataPath = path.join(__dirname, '../../data/sample-shipments.json');
    if (fs.existsSync(sampleDataPath)) {
      console.log('Loading sample shipments data from file for legs');
      const data = fs.readFileSync(sampleDataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading sample data:', err.message);
  }
  return [];
};

// Function to get sample legs for a shipment
const getSampleLegsForShipment = (shipmentId) => {
  const sampleShipments = getSampleShipments();
  const shipment = sampleShipments.find(s => s._id === shipmentId);
  
  if (shipment && shipment.legs && Array.isArray(shipment.legs)) {
    console.log(`Found ${shipment.legs.length} sample legs for shipment ${shipmentId}`);
    return shipment.legs;
  }
  
  console.log(`No sample legs found for shipment ${shipmentId}`);
  return [];
};

// @route   GET api/shipment-legs
// @desc    Get all shipment legs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const legs = await ShipmentLeg.find().sort({ createdAt: -1 });
    res.json(legs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipment-legs/shipment/:shipment_id
// @desc    Get all legs for a specific shipment
// @access  Public
router.get('/shipment/:shipment_id', async (req, res) => {
  try {
    const shipmentId = req.params.shipment_id;
    
    // Check if valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    // Find legs by shipment ID
    const legs = await ShipmentLeg.find({ shipment: shipmentId }).sort({ legOrder: 1 });
    
    if (!legs || legs.length === 0) {
      // Try to look up legs in the shipment document itself
      const shipment = await Shipment.findById(shipmentId);
      if (shipment && shipment.legs && shipment.legs.length > 0) {
        return res.json(shipment.legs);
      }
      
      return res.status(404).json({ msg: 'No legs found for this shipment' });
    }
    
    res.json(legs);
  } catch (err) {
    console.error('Error fetching legs by shipment:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipment-legs/reference/:reference
// @desc    Get all legs for a shipment by reference
// @access  Public
router.get('/reference/:reference', async (req, res) => {
  try {
    const reference = req.params.reference;
    
    // First try to find the shipment by reference
    const shipment = await Shipment.findOne({ 
      $or: [
        { reference: reference },
        { shipmentId: reference }
      ]
    });
    
    if (!shipment) {
      return res.status(404).json({ msg: 'No shipment found with this reference' });
    }
    
    // If shipment has legs embedded, return those
    if (shipment.legs && shipment.legs.length > 0) {
      return res.json(shipment.legs);
    }
    
    // Otherwise, find legs by shipment ID
    const legs = await ShipmentLeg.find({ shipment: shipment._id }).sort({ legOrder: 1 });
    
    if (!legs || legs.length === 0) {
      return res.status(404).json({ msg: 'No legs found for this shipment' });
    }
    
    res.json(legs);
  } catch (err) {
    console.error('Error fetching legs by reference:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipment-legs/:id
// @desc    Get a specific leg by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // Check if looking for legs of a shipment
    if (req.params.id.length === 24) {
      const id = req.params.id;
      
      // First try to find a leg with this ID
      const leg = await ShipmentLeg.findById(id);
      
      if (leg) {
        return res.json(leg);
      }
      
      // If not found as a leg ID, try as a shipment ID
      const shipmentId = id;
      const legs = await ShipmentLeg.find({ shipment: shipmentId }).sort({ legOrder: 1 });
      
      if (legs && legs.length > 0) {
        return res.json(legs);
      }
      
      // Check the shipment document for embedded legs
      const shipment = await Shipment.findById(shipmentId);
      if (shipment && shipment.legs && shipment.legs.length > 0) {
        return res.json(shipment.legs);
      }
      
      return res.status(404).json({ msg: 'No leg or shipment legs found with this ID' });
    } else {
      return res.status(400).json({ msg: 'Invalid ID format' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shipment-legs
// @desc    Create a new shipment leg
// @access  Public
router.post('/', [
  check('from', 'Origin is required').not().isEmpty(),
  check('to', 'Destination is required').not().isEmpty(),
  check('shipment', 'Shipment ID is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Create a new shipment leg
    const newLeg = new ShipmentLeg({
      from: req.body.from,
      to: req.body.to,
      carrier: req.body.carrier,
      legOrder: req.body.legOrder || 0,
      departureDate: req.body.departureDate,
      arrivalDate: req.body.arrivalDate,
      trackingNumber: req.body.trackingNumber,
      status: req.body.status || 'Not Started',
      notes: req.body.notes,
      shipment: req.body.shipment,
      changeLog: req.body.changeLog || []
    });

    const leg = await newLeg.save();
    
    // Update the shipment to include this leg ID in its legs array
    if (mongoose.Types.ObjectId.isValid(req.body.shipment)) {
      const shipment = await Shipment.findById(req.body.shipment);
      if (shipment) {
        if (!shipment.legs) {
          shipment.legs = [];
        }
        // Add this leg to the shipment's legs array
        shipment.legs.push(leg);
        await shipment.save();
      }
    }

    res.json(leg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shipment-legs/add-to-shipment/:shipment_id
// @desc    Add a leg directly to a shipment
// @access  Public
router.post('/add-to-shipment/:shipment_id', [
  check('from', 'Origin is required').not().isEmpty(),
  check('to', 'Destination is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const shipmentId = req.params.shipment_id;
    
    // Make sure shipment exists
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ msg: 'Invalid shipment ID' });
    }
    
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Create the leg
    const legData = {
      from: req.body.from,
      to: req.body.to,
      carrier: req.body.carrier,
      legOrder: req.body.legOrder || 0,
      departureDate: req.body.departureDate,
      arrivalDate: req.body.arrivalDate,
      trackingNumber: req.body.trackingNumber,
      status: req.body.status || 'Not Started',
      notes: req.body.notes,
      shipment: shipmentId,
      changeLog: req.body.changeLog || []
    };
    
    // Option 1: Add as a standalone leg document
    const newLeg = new ShipmentLeg(legData);
    const leg = await newLeg.save();
    
    // Option 2: Add to the shipment document's legs array
    if (!shipment.legs) {
      shipment.legs = [];
    }
    
    shipment.legs.push(leg);
    await shipment.save();
    
    res.json({ 
      message: 'Leg added to shipment successfully',
      leg: leg 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/shipment-legs/:id
// @desc    Update a shipment leg
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const leg = await ShipmentLeg.findById(req.params.id);
    
    if (!leg) {
      return res.status(404).json({ msg: 'Leg not found' });
    }

    // Update fields
    const {
      from, to, carrier, legOrder, departureDate,
      arrivalDate, trackingNumber, status, notes, changeLog
    } = req.body;
    
    if (from) leg.from = from;
    if (to) leg.to = to;
    if (carrier) leg.carrier = carrier;
    if (legOrder !== undefined) leg.legOrder = legOrder;
    if (departureDate) leg.departureDate = departureDate;
    if (arrivalDate) leg.arrivalDate = arrivalDate;
    if (trackingNumber) leg.trackingNumber = trackingNumber;
    if (status) leg.status = status;
    if (notes) leg.notes = notes;
    if (changeLog && Array.isArray(changeLog)) {
      leg.changeLog = changeLog;
    }
    
    await leg.save();
    
    // Also update the leg in the shipment
    if (leg.shipment) {
      try {
        const shipment = await Shipment.findById(leg.shipment);
        if (shipment && shipment.legs && Array.isArray(shipment.legs)) {
          // Find the leg in the shipment's legs array
          const legIndex = shipment.legs.findIndex(
            l => l._id.toString() === req.params.id
          );
          
          if (legIndex !== -1) {
            // Update the leg
            shipment.legs[legIndex] = {
              ...shipment.legs[legIndex],
              from: leg.from,
              to: leg.to,
              carrier: leg.carrier,
              legOrder: leg.legOrder,
              departureDate: leg.departureDate,
              arrivalDate: leg.arrivalDate,
              trackingNumber: leg.trackingNumber,
              status: leg.status,
              notes: leg.notes
            };
            
            await shipment.save();
          }
        }
      } catch (shipmentErr) {
        console.error('Error updating leg in shipment:', shipmentErr.message);
      }
    }
    
    res.json(leg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/shipment-legs/:id/status
// @desc    Update a shipment leg's status
// @access  Public
router.put('/:id/status', async (req, res) => {
  try {
    if (!req.body.status) {
      return res.status(400).json({ msg: 'Status is required' });
    }
    
    const leg = await ShipmentLeg.findById(req.params.id);
    
    if (!leg) {
      return res.status(404).json({ msg: 'Leg not found' });
    }
    
    leg.status = req.body.status;
    await leg.save();
    
    // Also update the leg in the shipment document if it exists there
    if (leg.shipment) {
      try {
        const shipment = await Shipment.findById(leg.shipment);
        if (shipment && shipment.legs && Array.isArray(shipment.legs)) {
          // Find the leg in the shipment's legs array
          const legIndex = shipment.legs.findIndex(
            l => l._id.toString() === req.params.id
          );
          
          if (legIndex !== -1) {
            // Update just the status
            shipment.legs[legIndex].status = req.body.status;
            await shipment.save();
          }
        }
      } catch (shipmentErr) {
        console.error('Error updating leg status in shipment:', shipmentErr.message);
      }
    }
    
    res.json(leg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/shipment-legs/:id
// @desc    Delete a shipment leg
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const leg = await ShipmentLeg.findById(req.params.id);
    
    if (!leg) {
      return res.status(404).json({ msg: 'Leg not found' });
    }
    
    // Get the shipment ID before deleting the leg
    const shipmentId = leg.shipment;
    
    // Delete the leg
    await leg.remove();
    
    // Also remove the leg from the shipment if it exists
    if (shipmentId) {
      try {
        const shipment = await Shipment.findById(shipmentId);
        if (shipment && shipment.legs && Array.isArray(shipment.legs)) {
          // Filter out the deleted leg from the legs array
          shipment.legs = shipment.legs.filter(
            l => l._id.toString() !== req.params.id
          );
          await shipment.save();
        }
      } catch (shipmentErr) {
        console.error('Error removing leg from shipment:', shipmentErr.message);
      }
    }
    
    res.json({ msg: 'Shipment leg removed' });
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

// @route   GET api/shipment-legs/export/:shipmentId
// @desc    Direct export of legs for a shipment with full debugging
// @access  Public
router.get('/export/:shipmentId', async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    console.log(`EXPORT: Getting raw leg data for shipment: ${shipmentId}`);
    
    // 1. Find legs directly by shipment ID relationship
    const directLegs = await ShipmentLeg.find({ shipment: shipmentId })
      .sort({ legOrder: 1 })
      .lean();
    
    console.log(`EXPORT: Found ${directLegs.length} direct legs`);
    
    // 2. Get the shipment to check its legs array
    const shipment = await Shipment.findById(shipmentId).lean();
    let referencedLegs = [];
    let referencedLegsData = [];
    
    if (shipment && shipment.legs && Array.isArray(shipment.legs)) {
      referencedLegs = shipment.legs;
      console.log(`EXPORT: Shipment has ${referencedLegs.length} leg references`);
      
      // Try to fetch each referenced leg
      for (const legId of referencedLegs) {
        try {
          const leg = await ShipmentLeg.findById(legId).lean();
          if (leg) {
            referencedLegsData.push(leg);
          } else {
            referencedLegsData.push({ _id: legId, error: 'Not found' });
          }
        } catch (err) {
          referencedLegsData.push({ _id: legId, error: err.message });
        }
      }
    } else {
      console.log(`EXPORT: Shipment has no legs array or it's not valid`);
    }
    
    // Return detailed information
    res.json({
      shipmentId,
      shipmentExists: !!shipment,
      directLegsCount: directLegs.length,
      directLegs,
      referencedLegsCount: referencedLegs.length,
      referencedLegsIds: referencedLegs,
      referencedLegsData,
      // Provide a merged, deduplicated list (prefer direct legs)
      mergedLegs: directLegs
    });
    
  } catch (err) {
    console.error(`EXPORT ERROR: ${err.message}`);
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router; 