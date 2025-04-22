const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');
const { checkConnectionState } = require('../../mongodb-connect');

const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');
const Customer = require('../../models/Customer');

// Function to load sample data if database is not available
const getSampleShipments = () => {
  try {
    const sampleDataPath = path.join(__dirname, '../../data/sample-shipments.json');
    if (fs.existsSync(sampleDataPath)) {
      console.log('Loading sample shipments data from file');
      const data = fs.readFileSync(sampleDataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading sample data:', err.message);
  }
  return [];
};

// @route   GET api/shipments
// @desc    Get all shipments
// @access  Public
router.get('/', checkConnectionState, async (req, res) => {
  // Check if database is connected, if not serve fallback data immediately
  if (!req.dbConnected) {
    console.log('Database not connected, using fallback data immediately');
    try {
      const sampleData = getSampleShipments();
      if (sampleData && sampleData.length > 0) {
        console.log(`Returning ${sampleData.length} sample shipments as fallback`);
        return res.json(sampleData);
      } else {
        return res.status(503).json({ 
          msg: 'Database connection is currently unavailable and no fallback data could be loaded.',
          connectionState: req.dbConnectionState ? req.dbConnectionState.state : 'unknown'
        });
      }
    } catch (sampleErr) {
      console.error('Failed to load sample data:', sampleErr.message);
      return res.status(503).json({ 
        msg: 'Database connection is currently unavailable and fallback data failed to load.',
        error: sampleErr.message 
      });
    }
  }
  
  // Database is connected, continue with normal operation
  try {
    const shipments = await Shipment.find().sort({ date: -1 });
    res.json(shipments);
  } catch (err) {
    console.error('Error fetching shipments:', err.message);
    
    // If there's an error, try to use sample data as a fallback
    try {
      const sampleData = getSampleShipments();
      if (sampleData && sampleData.length > 0) {
        console.log(`Returning ${sampleData.length} sample shipments due to DB error`);
        return res.json(sampleData);
      }
    } catch (sampleErr) {
      console.error('Also failed to load sample data:', sampleErr.message);
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/shipments/debug
// @desc    Debug endpoint to test request handling
// @access  Public
router.post('/debug', checkConnectionState, async (req, res) => {
  try {
    // Log the request details
    console.log('Debug endpoint called');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    // Echo back the request
    res.json({
      message: 'Debug endpoint successful',
      receivedBody: req.body,
      timestamp: new Date(),
      dbStatus: {
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState
      }
    });
  } catch (err) {
    console.error('Debug endpoint error:', err.message);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  }
});

// @route   GET api/shipments/repair-legs/:id
// @desc    Special endpoint to fix legs for a shipment
// @access  Public
router.get('/repair-legs/:id', checkConnectionState, async (req, res) => {
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
// @access  Public
router.get('/:id', checkConnectionState, async (req, res) => {
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
    
    res.json(shipment);
  } catch (err) {
    console.error('Error getting shipment by ID:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/shipments/:id/legs
// @desc    Get legs for a specific shipment
// @access  Public
router.get('/:id/legs', checkConnectionState, async (req, res) => {
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

// @route   POST api/shipments/:id/legs
// @desc    Create a new leg for a shipment
// @access  Public (temporarily for testing)
router.post('/:id/legs', [
  checkConnectionState,
  check('from', 'Origin is required').not().isEmpty(),
  check('to', 'Destination is required').not().isEmpty(),
  check('carrier', 'Carrier is required').not().isEmpty(),
  check('departureDate', 'Departure date is required').not().isEmpty(),
  check('arrivalDate', 'Arrival date is required').not().isEmpty(),
  check('legOrder', 'Leg order is required').isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // First check if the shipment exists
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Create the new leg object with all required fields
    const legFields = {
      shipment: req.params.id,
      shipmentId: req.params.id,
      from: req.body.from,
      to: req.body.to,
      origin: req.body.origin || { name: req.body.from },
      destination: req.body.destination || { name: req.body.to },
      carrier: req.body.carrier,
      legOrder: req.body.legOrder,
      departureDate: req.body.departureDate,
      arrivalDate: req.body.arrivalDate,
      status: req.body.status || 'Planned',
      // Generate a legId manually to avoid relying on pre-save hook
      legId: `LEG${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`
    };

    // Create and save the new leg with try/catch for better error handling
    try {
      console.log('Creating new leg for shipment:', req.params.id);
      console.log('Leg data:', legFields);
      
      const ShipmentLeg = mongoose.model('shipmentLeg');
      const newLeg = new ShipmentLeg(legFields);
      const leg = await newLeg.save();
      
      console.log('New leg created with ID:', leg._id);

      // Add the leg to the shipment's legs array
      if (!shipment.legs) {
        shipment.legs = [];
      }
      shipment.legs.push(leg._id);
      await shipment.save();
      console.log('Shipment updated with new leg reference');

      return res.json(leg);
    } catch (legErr) {
      console.error('Error creating leg:', legErr);
      return res.status(500).json({ 
        msg: 'Error creating leg', 
        error: legErr.message,
        stack: process.env.NODE_ENV === 'production' ? null : legErr.stack
      });
    }
  } catch (err) {
    console.error('Error in shipment leg creation route:', err.message);
    return res.status(500).json({ 
      msg: 'Server Error', 
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  }
});

// @route   POST api/shipments
// @desc    Create a new shipment
// @access  Public (temporarily for testing)
router.post('/', [
  checkConnectionState,
  check('reference', 'Reference is required').not().isEmpty(),
  check('origin', 'Origin is required').not().isEmpty(),
  check('destination', 'Destination is required').not().isEmpty(),
  check('carrier', 'Carrier is required').not().isEmpty(),
  check('shipperName', 'Shipper name is required').not().isEmpty(),
  check('consigneeName', 'Consignee name is required').not().isEmpty(),
  check('departureDate', 'Departure date is required').not().isEmpty(),
  check('arrivalDate', 'Arrival date is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Create a new shipment object with required fields
    const shipmentFields = {
      reference: req.body.reference,
      origin: req.body.origin,
      destination: req.body.destination,
      carrier: req.body.carrier,
      shipperName: req.body.shipperName,
      consigneeName: req.body.consigneeName,
      notifyParty: req.body.notifyParty || '',
      departureDate: req.body.departureDate,
      arrivalDate: req.body.arrivalDate,
      status: req.body.status || 'Planned',
      // Include any other fields from the request
      orderStatus: req.body.orderStatus || 'planned',
      shipmentStatus: req.body.shipmentStatus || 'Pending',
      invoiced: req.body.invoiced || false,
      invoiceSent: req.body.invoiceSent || false,
      cost: req.body.cost || 0,
      receivables: req.body.receivables || 0,
      invoiceStatus: req.body.invoiceStatus || 'Pending',
      customer: req.body.customer || 'N/A' // Default customer value
    };

    // Add customer if provided
    if (req.body.customer) {
      shipmentFields.customer = req.body.customer;
    }

    // Create and save the new shipment
    const newShipment = new Shipment(shipmentFields);
    const shipment = await newShipment.save();

    res.json(shipment);
  } catch (err) {
    console.error('Error creating shipment:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipments/public/:id
// @desc    Get shipment by ID without authentication
// @access  Public
router.get('/public/:id', async (req, res) => {
  try {
    console.log(`Accessing public shipment endpoint for ID: ${req.params.id}`);
    
    // Validate if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid shipment ID format: ${req.params.id}`);
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    try {
      // Get shipment by ID
      const shipment = await Shipment.findById(req.params.id).lean();
      
      if (!shipment) {
        console.log(`Shipment not found with ID: ${req.params.id}`);
        return res.status(404).json({ msg: 'Shipment not found' });
      }
      
      // Handle customer reference as it could be invalid
      if (shipment.customer && typeof shipment.customer === 'object') {
        // It's already populated
        console.log('Customer is already populated');
      } else if (shipment.customer && mongoose.Types.ObjectId.isValid(shipment.customer)) {
        // Try to populate customer
        try {
          const customer = await Customer.findById(shipment.customer).lean();
          if (customer) {
            shipment.customer = customer;
          } else {
            console.log(`Customer not found for ID: ${shipment.customer}`);
            shipment.customer = { name: shipment.customerName || 'Unknown Customer' };
          }
        } catch (customerErr) {
          console.error(`Error fetching customer: ${customerErr.message}`);
          shipment.customer = { name: shipment.customerName || 'Unknown Customer' };
        }
      } else {
        // Invalid or missing customer ID
        console.log(`Invalid or missing customer ID: ${shipment.customer}`);
        shipment.customer = { name: shipment.customerName || 'Unknown Customer' };
      }
      
      // Get legs associated with this shipment
      try {
        const legs = await ShipmentLeg.find({ shipment: req.params.id })
          .sort({ legOrder: 1 })
          .lean();
        
        console.log(`Found ${legs.length} legs for shipment ${req.params.id}`);
        
        // Add legs to shipment object
        shipment.legs = legs;
      } catch (legsErr) {
        console.error(`Error fetching legs: ${legsErr.message}`);
        shipment.legs = [];
      }
      
      console.log(`Successfully retrieved shipment with ID: ${req.params.id}`);
      res.json(shipment);
    } catch (shipmentErr) {
      console.error(`Error fetching shipment: ${shipmentErr.message}`);
      res.status(500).json({ 
        msg: 'Error fetching shipment data',
        error: shipmentErr.message
      });
    }
  } catch (err) {
    console.error(`Error in public shipment endpoint for ID ${req.params.id}:`, err.message);
    res.status(500).json({ 
      msg: 'Server error',
      error: err.message
    });
  }
});

// @route   GET api/shipments/public
// @desc    Get all shipments without authentication
// @access  Public
router.get('/public', async (req, res) => {
  try {
    console.log('Accessing public shipments list endpoint');
    
    // Limit to 100 shipments for performance reasons
    const shipments = await Shipment.find()
      .sort({ dateAdded: -1 })
      .limit(100)
      .lean();
    
    console.log(`Found ${shipments.length} shipments`);
    
    // Process shipments to normalize data
    const processedShipments = shipments.map(shipment => {
      // Handle invalid customer references
      if (shipment.customer && !mongoose.Types.ObjectId.isValid(shipment.customer)) {
        shipment.customer = null;
        shipment.customerName = shipment.customerName || 'Unknown Customer';
      }
      
      return shipment;
    });
    
    res.json(processedShipments);
  } catch (err) {
    console.error('Error fetching public shipments list:', err.message);
    
    // Try to return sample data as fallback
    try {
      const sampleData = getSampleShipments();
      console.log(`Returning ${sampleData.length} sample shipments due to error`);
      return res.json(sampleData);
    } catch (sampleErr) {
      console.error('Also failed to get sample data:', sampleErr.message);
    }
    
    res.status(500).json({ 
      msg: 'Server error',
      error: err.message
    });
  }
});

module.exports = router; 
