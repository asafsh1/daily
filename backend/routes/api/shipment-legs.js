const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { checkConnectionState } = require('../../mongodb-connect');

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
  
  if (shipment) {
    // Create some sample legs for this shipment
    return [
      {
        "_id": `${shipmentId}-leg-1`,
        "legId": "LEG001",
        "legOrder": 1,
        "from": shipment.origin,
        "to": shipment.destination,
        "carrier": shipment.airline || "Sample Carrier",
        "departureDate": shipment.date,
        "arrivalDate": shipment.estimatedDelivery,
        "trackingNumber": shipment.trackingNumbers ? shipment.trackingNumbers[0] : "SAMPLE-TRACK",
        "status": "In Transit",
        "shipment": shipmentId,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ];
  }
  
  console.log(`No sample legs found for shipment ${shipmentId}`);
  return [];
};

// @route   GET api/shipment-legs
// @desc    Get all shipment legs
// @access  Public
router.get('/', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    // In fallback mode, return some legs from all sample shipments
    try {
      const sampleShipments = getSampleShipments();
      const allSampleLegs = [];
      
      sampleShipments.forEach(shipment => {
        const legs = [
          {
            "_id": `${shipment._id}-leg-1`,
            "legId": "LEG001",
            "legOrder": 1,
            "from": shipment.origin,
            "to": shipment.destination,
            "carrier": shipment.airline || "Sample Carrier",
            "departureDate": shipment.date,
            "arrivalDate": shipment.estimatedDelivery,
            "trackingNumber": shipment.trackingNumbers ? shipment.trackingNumbers[0] : "SAMPLE-TRACK",
            "status": "In Transit",
            "shipment": shipment._id,
            "createdAt": "2023-01-01T00:00:00.000Z",
            "updatedAt": "2023-01-01T00:00:00.000Z"
          }
        ];
        allSampleLegs.push(...legs);
      });
      
      console.log(`Returning ${allSampleLegs.length} sample legs`);
      return res.json(allSampleLegs);
    } catch (err) {
      console.error('Error generating sample legs:', err.message);
      return res.status(503).json({
        msg: 'Database connection is unavailable and sample data could not be generated',
        error: err.message
      });
    }
  }
  
  // Database is connected, proceed with normal operation
  try {
    const legs = await ShipmentLeg.find().sort({ createdAt: -1 });
    res.json(legs);
  } catch (err) {
    console.error('Error fetching all legs:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/shipment-legs/shipment/:shipment_id
// @desc    Get all legs for a specific shipment
// @access  Public
router.get('/shipment/:shipment_id', checkConnectionState, async (req, res) => {
  const shipmentId = req.params.shipment_id;
  
  // Check if database is connected
  if (!req.dbConnected) {
    // In fallback mode, return sample legs for this shipment
    console.log(`Using fallback to get legs for shipment ${shipmentId}`);
    const sampleLegs = getSampleLegsForShipment(shipmentId);
    return res.json(sampleLegs);
  }
  
  try {
    // Check if valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    // First try to get the shipment to check for embedded legs
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // If shipment has legs embedded, return those
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      console.log(`Found ${shipment.legs.length} embedded legs in shipment`);
      return res.json(shipment.legs);
    }
    
    // If no embedded legs, look for standalone legs
    const standaloneLegs = await ShipmentLeg.find({ 
      $or: [
        { shipment: shipmentId },
        { shipmentId: shipmentId }
      ]
    }).sort({ legOrder: 1 });
    
    if (standaloneLegs && standaloneLegs.length > 0) {
      console.log(`Found ${standaloneLegs.length} standalone legs for shipment`);
      return res.json(standaloneLegs);
    }
    
    // If no legs found at all, return empty array
    console.log('No legs found for shipment');
    return res.json([]);
    
  } catch (err) {
    console.error('Error fetching legs by shipment:', err.message);
    
    // Try to return sample legs on error
    const sampleLegs = getSampleLegsForShipment(shipmentId);
    if (sampleLegs.length > 0) {
      console.log(`Returning sample legs for shipment ${shipmentId} due to error`);
      return res.json(sampleLegs);
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/shipment-legs/reference/:reference
// @desc    Get all legs for a shipment by reference
// @access  Public
router.get('/reference/:reference', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    return res.status(503).json({ 
      msg: 'Cannot look up legs by reference: Database connection is unavailable.'
    });
  }
  
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
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/shipment-legs/:id
// @desc    Get a specific leg by ID
// @access  Public
router.get('/:id', checkConnectionState, async (req, res) => {
  // Check if database is connected
  if (!req.dbConnected) {
    return res.status(503).json({ 
      msg: 'Cannot look up leg by ID: Database connection is unavailable.'
    });
  }
  
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
    console.error('Error fetching leg by ID:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/shipment-legs
// @desc    Create a new shipment leg
// @access  Public
router.post('/', [
  checkConnectionState,
  check('from', 'Origin is required').not().isEmpty(),
  check('to', 'Destination is required').not().isEmpty(),
  check('shipment', 'Shipment ID is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if database is connected
  if (!req.dbConnected) {
    return res.status(503).json({ 
      msg: 'Cannot create leg: Database connection is unavailable.',
      errors: [{ msg: 'Database is offline. Please try again later.' }]
    });
  }

  try {
    // Generate a legId manually to avoid relying on pre-save hook
    const legId = `LEG${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;
    console.log('Manually generated legId:', legId);
    
    // Create a new shipment leg
    const newLeg = new ShipmentLeg({
      from: req.body.from,
      to: req.body.to,
      carrier: req.body.carrier,
      legOrder: req.body.legOrder || 0,
      departureDate: req.body.departureDate,
      arrivalDate: req.body.arrivalDate,
      trackingNumber: req.body.trackingNumber,
      status: req.body.status || 'Pending',
      notes: req.body.notes,
      shipment: req.body.shipment,
      // Add compatibility fields
      origin: req.body.from,
      destination: req.body.to,
      legId: legId
    });

    // Save the leg
    const leg = await newLeg.save();
    
    // Update the parent shipment to add this leg's reference
    try {
      // Find the parent shipment
      const shipment = await Shipment.findById(req.body.shipment);
      if (shipment) {
        // Initialize legs array if it doesn't exist
        if (!shipment.legs) shipment.legs = [];
        
        // Add the new leg to the shipment's legs array if not already there
        if (!shipment.legs.includes(leg._id)) {
          shipment.legs.push(leg._id);
          await shipment.save();
          console.log(`Added leg ${leg._id} to shipment ${shipment._id}`);
        }
      }
    } catch (shipmentErr) {
      console.error('Error updating parent shipment with new leg:', shipmentErr.message);
      // Continue - we still want to return the created leg even if updating the shipment fails
    }

    res.json(leg);
  } catch (err) {
    console.error('Error creating shipment leg:', err.message);
    res.status(500).json({ 
      msg: 'Server Error', 
      error: err.message,
      errors: [{ msg: err.message }]
    });
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
    
    // Generate a legId manually
    const legId = `LEG${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;
    console.log('Manually generated legId:', legId);
    
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
      changeLog: req.body.changeLog || [],
      // Set the legId manually
      legId: legId,
      // Add compatibility fields
      origin: req.body.from,
      destination: req.body.to,
      shipmentId: shipmentId
    };
    
    try {
      // Option 1: Add as a standalone leg document
      const newLeg = new ShipmentLeg(legData);
      console.log('Saving leg with data:', legData);
      const leg = await newLeg.save();
      console.log('Successfully saved leg:', leg._id);
      
      // Option 2: Add to the shipment document's legs array
      try {
        if (!shipment.legs) {
          shipment.legs = [];
        }
        
        shipment.legs.push(leg._id);
        await shipment.save();
        console.log('Added leg to shipment:', shipment._id);
        
        return res.json({ 
          message: 'Leg added to shipment successfully',
          leg: leg 
        });
      } catch (shipmentErr) {
        console.error('Error adding leg to shipment:', shipmentErr);
        // Return the leg anyway since we've already created it
        return res.json({ 
          message: 'Leg created successfully but failed to update shipment',
          leg: leg,
          error: shipmentErr.message
        });
      }
    } catch (legErr) {
      console.error('Error saving leg:', legErr);
      return res.status(500).json({ 
        msg: 'Error saving leg', 
        error: legErr.message,
        stack: process.env.NODE_ENV === 'production' ? null : legErr.stack
      });
    }
  } catch (err) {
    console.error('Error in add-to-shipment route:', err);
    return res.status(500).json({
      msg: 'Server Error',
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  }
});

// @route   PUT api/shipment-legs/:id
// @desc    Update a shipment leg
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const leg = await ShipmentLeg.findById(req.params.id);
    
    if (!leg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }
    
    // Check if status has changed to update the status history
    if (req.body.status && req.body.status !== leg.status) {
      if (!leg.statusHistory) {
        leg.statusHistory = [];
      }
      
      leg.statusHistory.push({
        status: req.body.status,
        timestamp: new Date()
      });
    }
    
    // Create changelog entry
    const changeLogEntry = {
      timestamp: new Date(),
      user: req.body.user || 'User',
      action: 'Update',
      details: 'Updated leg information',
      fields: {}
    };
    
    // Track which fields changed
    if (req.body.from && req.body.from !== leg.from) {
      changeLogEntry.fields.from = { old: leg.from, new: req.body.from };
    }
    if (req.body.to && req.body.to !== leg.to) {
      changeLogEntry.fields.to = { old: leg.to, new: req.body.to };
    }
    if (req.body.carrier && req.body.carrier !== leg.carrier) {
      changeLogEntry.fields.carrier = { old: leg.carrier, new: req.body.carrier };
    }
    if (req.body.status && req.body.status !== leg.status) {
      changeLogEntry.fields.status = { old: leg.status, new: req.body.status };
      changeLogEntry.details = `Status changed from ${leg.status} to ${req.body.status}`;
    }
    if (req.body.departureDate && req.body.departureDate !== leg.departureDate) {
      changeLogEntry.fields.departureDate = { 
        old: leg.departureDate, 
        new: req.body.departureDate 
      };
    }
    if (req.body.arrivalDate && req.body.arrivalDate !== leg.arrivalDate) {
      changeLogEntry.fields.arrivalDate = { 
        old: leg.arrivalDate, 
        new: req.body.arrivalDate 
      };
    }
    
    // Add changelog entry if we have changes
    if (Object.keys(changeLogEntry.fields).length > 0) {
      if (!leg.changeLog) {
        leg.changeLog = [];
      }
      leg.changeLog.push(changeLogEntry);
    }
    
    // Update all the fields
    if (req.body.from) leg.from = req.body.from;
    if (req.body.to) leg.to = req.body.to;
    if (req.body.carrier) leg.carrier = req.body.carrier;
    if (req.body.legOrder !== undefined) leg.legOrder = req.body.legOrder;
    if (req.body.departureDate) leg.departureDate = req.body.departureDate;
    if (req.body.arrivalDate) leg.arrivalDate = req.body.arrivalDate;
    if (req.body.trackingNumber) leg.trackingNumber = req.body.trackingNumber;
    if (req.body.status) leg.status = req.body.status;
    if (req.body.notes !== undefined) leg.notes = req.body.notes;
    if (req.body.flightNumber) leg.flightNumber = req.body.flightNumber;
    
    // Update compatibility fields
    if (req.body.from) leg.origin = req.body.from;
    if (req.body.to) leg.destination = req.body.to;
    if (req.body.trackingNumber) leg.mawbNumber = req.body.trackingNumber;
    if (req.body.departureDate) leg.departureTime = req.body.departureDate;
    if (req.body.arrivalDate) leg.arrivalTime = req.body.arrivalDate;
    
    // Update timestamp
    leg.updatedAt = Date.now();
    
    await leg.save();
    res.json(leg);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/shipment-legs/:id/status
// @desc    Update just the status of a leg
// @access  Public
router.put('/:id/status', async (req, res) => {
  try {
    const leg = await ShipmentLeg.findById(req.params.id);
    
    if (!leg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }
    
    // Only update the status
    if (req.body.status) {
      // Track status history
      if (!leg.statusHistory) {
        leg.statusHistory = [];
      }
      
      // Add status change to history
      leg.statusHistory.push({
        status: req.body.status,
        timestamp: new Date()
      });
      
      // Update the current status
      leg.status = req.body.status;
      leg.updatedAt = Date.now();
      
      await leg.save();
      res.json(leg);
    } else {
      return res.status(400).json({ msg: 'Status field is required' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipment-legs/:id/history
// @desc    Get the status history of a leg
// @access  Public
router.get('/:id/history', async (req, res) => {
  try {
    const leg = await ShipmentLeg.findById(req.params.id);
    
    if (!leg) {
      return res.status(404).json({ msg: 'Shipment leg not found' });
    }
    
    // Return the status history
    res.json(leg.statusHistory || []);
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
    const shipmentId = leg.shipment || leg.shipmentId;
    
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
      { 
        $or: [
          { shipment: tempId },
          { shipmentId: tempId }
        ]
      },
      { 
        $set: { 
          shipment: shipmentId,
          shipmentId: shipmentId
        } 
      }
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
    const directLegs = await ShipmentLeg.find({ 
      $or: [
        { shipment: shipmentId },
        { shipmentId: shipmentId }
      ]
    })
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

// Add debugging endpoint to search for legs in all possible ways

// @route   GET api/shipment-legs/debug/:shipmentId
// @desc    Debug endpoint to find all possible legs for a shipment and explain where they are
// @access  Public
router.get('/debug/:shipmentId', async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    console.log(`[DEBUG SEARCH] Searching for legs for shipment: ${shipmentId}`);
    
    const results = {
      shipmentId,
      timestamp: new Date().toISOString(),
      methods: [],
      allLegsFound: [],
      mongoDbConnectionState: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    };
    
    // Method 1: Check if shipment exists and get basic info
    try {
      const shipment = await Shipment.findById(shipmentId).lean();
      
      results.methods.push({
        method: "Shipment Lookup",
        success: !!shipment,
        details: shipment ? {
          shipmentId: shipment._id,
          reference: shipment.reference || 'Not set',
          hasLegsArray: !!shipment.legs,
          legsArrayType: shipment.legs ? typeof shipment.legs : 'N/A',
          legsCount: shipment.legs && Array.isArray(shipment.legs) ? shipment.legs.length : 0
        } : { error: 'Shipment not found' }
      });
      
      // If shipment has legs directly in the document, add them to results
      if (shipment && shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
        const embeddedLegs = shipment.legs.map(leg => ({
          ...leg,
          source: 'embedded_in_shipment',
          _debugId: leg._id ? leg._id.toString() : 'no_id'
        }));
        
        results.methods.push({
          method: "Embedded Legs",
          success: true,
          count: embeddedLegs.length,
          legs: embeddedLegs
        });
        
        results.allLegsFound = [...results.allLegsFound, ...embeddedLegs];
      }
    } catch (err) {
      results.methods.push({
        method: "Shipment Lookup",
        success: false,
        error: err.message
      });
    }
    
    // Method 2: Look for legs directly associated with shipment ID
    try {
      const directLegs = await ShipmentLeg.find({ 
        $or: [
          { shipment: shipmentId },
          { shipmentId: shipmentId }
        ]
      }).lean();
      
      const formattedLegs = directLegs.map(leg => ({
        ...leg,
        source: 'direct_association',
        _debugId: leg._id.toString()
      }));
      
      results.methods.push({
        method: "Direct Leg Association",
        success: true,
        count: directLegs.length,
        legs: formattedLegs
      });
      
      results.allLegsFound = [...results.allLegsFound, ...formattedLegs];
    } catch (err) {
      results.methods.push({
        method: "Direct Leg Association",
        success: false,
        error: err.message
      });
    }
    
    // Method 3: Check if shipment has reference field and look up legs by that
    try {
      const shipment = await Shipment.findById(shipmentId).lean();
      if (shipment && shipment.reference) {
        const referenceLegs = await ShipmentLeg.find({ 
          $or: [
            { reference: shipment.reference },
            { shipmentReference: shipment.reference }
          ]
        }).lean();
        
        const formattedLegs = referenceLegs.map(leg => ({
          ...leg,
          source: 'reference_lookup',
          _debugId: leg._id.toString()
        }));
        
        results.methods.push({
          method: "Reference Lookup",
          success: true,
          referenceValue: shipment.reference,
          count: referenceLegs.length,
          legs: formattedLegs
        });
        
        results.allLegsFound = [...results.allLegsFound, ...formattedLegs];
      } else {
        results.methods.push({
          method: "Reference Lookup",
          success: false,
          error: "Shipment not found or has no reference field"
        });
      }
    } catch (err) {
      results.methods.push({
        method: "Reference Lookup",
        success: false,
        error: err.message
      });
    }
    
    // Method 4: If shipment has legsIds array (references to legs) instead of embedded legs
    try {
      const shipment = await Shipment.findById(shipmentId).lean();
      if (shipment && shipment.legs && Array.isArray(shipment.legs)) {
        // Check if the first leg is an object (embedded) or string/ObjectId (reference)
        const firstLeg = shipment.legs[0];
        const areLegsReferences = firstLeg && (typeof firstLeg === 'string' || (firstLeg._id && !firstLeg.from));
        
        if (areLegsReferences) {
          const legIds = shipment.legs.map(leg => 
            typeof leg === 'string' ? leg : leg._id.toString()
          );
          
          // Find all the referenced legs
          const referencedLegs = await ShipmentLeg.find({
            _id: { $in: legIds }
          }).lean();
          
          const formattedLegs = referencedLegs.map(leg => ({
            ...leg,
            source: 'leg_reference',
            _debugId: leg._id.toString()
          }));
          
          results.methods.push({
            method: "Referenced Legs",
            success: true,
            expectedCount: legIds.length,
            foundCount: referencedLegs.length,
            missingIds: legIds.filter(id => 
              !referencedLegs.some(leg => leg._id.toString() === id)
            ),
            legs: formattedLegs
          });
          
          results.allLegsFound = [...results.allLegsFound, ...formattedLegs];
        }
      }
    } catch (err) {
      results.methods.push({
        method: "Referenced Legs",
        success: false,
        error: err.message
      });
    }
    
    // Deduplicate legs (might have found same leg through multiple methods)
    const uniqueLegs = [];
    const legIds = new Set();
    
    results.allLegsFound.forEach(leg => {
      const legId = leg._debugId || leg._id?.toString();
      if (legId && !legIds.has(legId)) {
        legIds.add(legId);
        uniqueLegs.push(leg);
      }
    });
    
    results.uniqueLegsCount = uniqueLegs.length;
    results.uniqueLegs = uniqueLegs;
    
    // Return the full diagnostic information
    res.json(results);
    
  } catch (err) {
    console.error('Error in leg debugging endpoint:', err);
    res.status(500).json({
      error: 'Server Error',
      message: err.message,
      stack: err.stack
    });
  }
});

module.exports = router; 