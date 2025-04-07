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

// @route   GET api/shipment-legs/:shipmentId
// @desc    Get all legs for a shipment
// @access  Private
router.get('/:shipmentId', auth, async (req, res) => {
  try {
    // Check for valid database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Database connection is not ready, using sample data');
      return res.json(getSampleLegsForShipment(req.params.shipmentId));
    }
    
    // Check if the shipment ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.shipmentId) && 
        !req.params.shipmentId.startsWith('temp-')) {
      return res.status(400).json({
        error: 'Invalid shipment ID format',
        legs: []
      });
    }
    
    // Try to get the shipment first since it may have embedded legs
    try {
      const shipment = await Shipment.findById(req.params.shipmentId);
      
      if (!shipment) {
        // If not found, check sample data
        const sampleLegs = getSampleLegsForShipment(req.params.shipmentId);
        if (sampleLegs.length > 0) {
          return res.json(sampleLegs);
        }
        
        return res.status(404).json({ 
          error: 'Shipment not found',
          legs: [] 
        });
      }
      
      // Check if the shipment has embedded legs array with data
      if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
        // Check if the first leg has proper fields (this means it's an embedded leg object, not just references)
        if (shipment.legs[0].from || shipment.legs[0].origin) {
          console.log(`Using ${shipment.legs.length} embedded legs from shipment document`);
          return res.json(shipment.legs);
        }
        
        // If we have leg references, try to look up the actual legs
        try {
          const referencedLegs = await ShipmentLeg.find({
            _id: { $in: shipment.legs }
          }).sort({ legOrder: 1 });
          
          if (referencedLegs.length > 0) {
            console.log(`Found ${referencedLegs.length} referenced legs`);
            return res.json(referencedLegs);
          }
        } catch (refErr) {
          console.error(`Error fetching referenced legs: ${refErr.message}`);
          // Fall through to continue with other methods
        }
      }
      
      // If no legs in shipment, try to find legs directly associated with the shipment
      const legs = await ShipmentLeg.find({ shipment: req.params.shipmentId })
        .sort({ legOrder: 1 })
        .limit(20);
      
      if (legs.length > 0) {
        console.log(`Found ${legs.length} legs in shipmentLeg collection`);
        return res.json(legs);
      }
      
      // No legs found, check sample data
      const sampleLegs = getSampleLegsForShipment(req.params.shipmentId);
      if (sampleLegs.length > 0) {
        return res.json(sampleLegs);
      }
      
      // No legs found in any location
      return res.json([]);
      
    } catch (err) {
      console.error(`Error getting shipment: ${err.message}`);
      
      // Try direct leg lookup if shipment lookup fails
      const legs = await ShipmentLeg.find({ shipment: req.params.shipmentId })
        .sort({ legOrder: 1 })
        .limit(20);
      
      if (legs.length > 0) {
        return res.json(legs);
      }
      
      // Try sample data as last resort
      const sampleLegs = getSampleLegsForShipment(req.params.shipmentId);
      if (sampleLegs.length > 0) {
        return res.json(sampleLegs);
      }
      
      return res.json([]);
    }
  } catch (err) {
    console.error('Error fetching legs:', err.message);
    
    // Try sample data as last resort
    const sampleLegs = getSampleLegsForShipment(req.params.shipmentId);
    if (sampleLegs.length > 0) {
      return res.json(sampleLegs);
    }
    
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
      console.log(`Creating new shipment leg for shipment: ${req.body.shipment}`);
      
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

      console.log(`Saving new leg: ${newLeg.from} to ${newLeg.to}`);
      const leg = await newLeg.save();
      console.log(`Leg saved with ID: ${leg._id}`);

      // IMPORTANT: Add this leg to the shipment's legs array
      if (!shipmentDoc.legs) {
        shipmentDoc.legs = [];
      }
      
      // Check if the leg ID is already in the array to avoid duplicates
      const legIdStr = leg._id.toString();
      const existingLegIds = shipmentDoc.legs.map(id => id.toString());
      
      if (!existingLegIds.includes(legIdStr)) {
        shipmentDoc.legs.push(leg._id);
        console.log(`Added leg ID ${leg._id} to shipment's legs array`);
      } else {
        console.log(`Leg ID ${leg._id} already in shipment's legs array`);
      }

      // Add to the shipment's change log
      shipmentDoc.changeLog.push({
        timestamp: new Date(),
        user: req.user.id,
        action: 'added-leg',
        details: `Added leg from ${newLeg.from} to ${newLeg.to}`
      });
      
      console.log(`Saving updated shipment with new leg reference`);
      await shipmentDoc.save();
      console.log(`Shipment saved successfully with new leg`);

      // Return full information including the leg IDs now stored in the shipment
      res.json({
        leg,
        shipment: {
          _id: shipmentDoc._id,
          legs: shipmentDoc.legs
        },
        success: true
      });
    } catch (err) {
      console.error(`Error creating shipment leg: ${err.message}`);
      res.status(500).json({
        error: 'Server Error', 
        message: err.message,
        success: false
      });
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

// @route   POST api/shipment-legs/add-to-shipment/:shipmentId
// @desc    Add a leg directly to a shipment by ID
// @access  Private
router.post(
  '/add-to-shipment/:shipmentId',
  [
    auth,
    [
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
      const shipmentId = req.params.shipmentId;
      console.log(`Adding leg directly to shipment: ${shipmentId}`);
      
      // Find the associated shipment
      const shipment = await Shipment.findById(shipmentId);
      if (!shipment) {
        return res.status(404).json({ msg: 'Shipment not found' });
      }

      // Extract fields from request
      const {
        from,
        to, 
        carrier,
        departureDate,
        arrivalDate,
        trackingNumber,
        status,
        notes,
        legOrder
      } = req.body;

      // Create new leg document
      const newLeg = new ShipmentLeg({
        shipment: shipmentId,
        from,
        to,
        carrier: carrier || '',
        departureDate,
        arrivalDate,
        trackingNumber: trackingNumber || '',
        status: status || 'pending',
        notes: notes || '',
        legOrder: legOrder || 0
      });

      console.log(`Saving new leg from ${from} to ${to}`);
      const savedLeg = await newLeg.save();
      console.log(`Leg saved with ID: ${savedLeg._id}`);

      // Initialize legs array if it doesn't exist
      if (!shipment.legs) {
        shipment.legs = [];
      }
      
      // Add the leg to the shipment's legs array
      shipment.legs.push(savedLeg._id);
      console.log(`Added leg ID ${savedLeg._id} to shipment's legs array`);

      // Update the shipment's change log
      shipment.changeLog.push({
        timestamp: new Date(),
        user: req.user.id,
        action: 'added-leg',
        details: `Added leg from ${from} to ${to}`
      });

      await shipment.save();
      console.log(`Updated shipment with new leg reference`);

      res.json({
        success: true,
        leg: savedLeg,
        message: 'Leg added to shipment successfully'
      });
    } catch (err) {
      console.error(`Error adding leg to shipment: ${err.message}`);
      res.status(500).json({ 
        success: false,
        error: 'Server Error',
        message: err.message
      });
    }
  }
);

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