const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Shipment = require('../../models/Shipment');

// @route   GET api/shipments
// @desc    Get all shipments
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('Processing shipments request - FIXED DIRECT VERSION');
    
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      // Return empty data with same structure to avoid frontend errors
      return res.json({
        shipments: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 0
        }
      });
    }
    
    console.log('Database connected, fetching ALL shipments directly');
    
    try {
      // Get all shipments WITHOUT POPULATE to avoid ObjectId casting errors
      const allShipments = await Shipment.find()
        .sort({ dateAdded: -1 })
        .lean();
      
      console.log(`Directly found ${allShipments.length} shipments without populate`);
      
      // Process customers manually to handle both string names and ObjectIds
      const processedShipments = allShipments.map(shipment => {
        // If customer is a string (name), leave it as is
        // Otherwise, it's already an ObjectId reference that would be populated
        return {
          ...shipment,
          // Ensure customer is always presented in a consistent format
          customer: typeof shipment.customer === 'string' 
            ? { name: shipment.customer } // Convert string to object format
            : shipment.customer // Keep as is for ObjectId references
        };
      });
      
      console.log(`Processed ${processedShipments.length} shipments for customer references`);
      
      // Get the count separately
      const count = await Shipment.countDocuments();
      console.log(`Count reports ${count} shipments`);
      
      // Return all shipments with simple pagination
      return res.json({
        shipments: processedShipments,
        pagination: {
          total: count,
          page: 1,
          pages: 1
        }
      });
    } catch (queryErr) {
      console.error('Error in direct shipment query:', queryErr);
      
      // If this is a customer ObjectId casting error, try a more direct approach
      if (queryErr.message && queryErr.message.includes('Cast to ObjectId failed')) {
        console.log('Detected ObjectId casting error, trying fallback approach...');
        
        try {
          // Get all shipments with absolutely no filtering or population
          const basicShipments = await Shipment.find({}, null, { lean: true });
          console.log(`Fallback query found ${basicShipments.length} shipments`);
          
          // Format them minimally for display
          const simpleShipments = basicShipments.map(ship => ({
            ...ship,
            customer: typeof ship.customer === 'string' 
              ? { name: ship.customer } 
              : (ship.customer || { name: 'Unknown' })
          }));
          
          return res.json({
            shipments: simpleShipments,
            pagination: {
              total: simpleShipments.length,
              page: 1,
              pages: 1
            },
            note: 'Using fallback data due to customer reference issues'
          });
        } catch (fallbackErr) {
          console.error('Even fallback approach failed:', fallbackErr);
          throw fallbackErr;
        }
      }
      
      throw queryErr;
    }
  } catch (err) {
    console.error('Error in shipments request:', err.message);
    return res.status(500).json({
      error: 'Error retrieving shipments',
      message: err.message
    });
  }
});

// @route   GET api/shipments/:id
// @desc    Get shipment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      // Return empty shipment data to avoid frontend errors
      return res.json({
        _id: req.params.id,
        dateAdded: new Date(),
        customer: null,
        legs: [],
        shipmentStatus: 'Pending',
        orderStatus: 'planned',
        invoiced: false
      });
    }
    
    // Get shipment without populating customer to avoid ObjectId casting errors
    const shipment = await Shipment.findById(req.params.id)
      .populate({
        path: 'legs',
        options: { sort: { legOrder: 1 } }, // Sort legs by order
        select: 'awbNumber departureTime arrivalTime origin destination legOrder flightNumber'
      });
    
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Process customer field manually to handle both string and ObjectId references
    let result = shipment.toObject();
    
    // If customer is a string (name), convert to object format
    if (typeof result.customer === 'string') {
      result.customer = { name: result.customer };
    } 
    // If customer is an ObjectId, try to populate it
    else if (result.customer && mongoose.Types.ObjectId.isValid(result.customer)) {
      try {
        const customerDoc = await mongoose.model('customer').findById(result.customer);
        if (customerDoc) {
          result.customer = {
            _id: customerDoc._id,
            name: customerDoc.name,
            contactPerson: customerDoc.contactPerson,
            email: customerDoc.email,
            phone: customerDoc.phone
          };
        }
      } catch (err) {
        console.error('Error populating customer:', err.message);
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Error getting shipment by ID:', err.message);
    
    // For ObjectId errors, return 404
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Return empty shipment data for other errors
    res.json({
      _id: req.params.id,
      dateAdded: new Date(),
      customer: null,
      legs: [],
      shipmentStatus: 'Pending',
      orderStatus: 'planned',
      invoiced: false
    });
  }
});

// @route   POST api/shipments
// @desc    Create a shipment
// @access  Public
router.post(
  '/',
  [
    check('dateAdded', 'Date added is required').not().isEmpty(),
    check('orderStatus', 'Order status is required').not().isEmpty(),
    check('customer', 'Customer is required').not().isEmpty()
  ],
  async (req, res) => {
    console.log('Received shipment data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Ensure dates are properly formatted
      let shipmentData = {...req.body};
      
      try {
        // Format dateAdded if it exists
        if (shipmentData.dateAdded) {
          shipmentData.dateAdded = new Date(shipmentData.dateAdded);
        }
        
        // Format scheduledArrival if it exists
        if (shipmentData.scheduledArrival) {
          shipmentData.scheduledArrival = new Date(shipmentData.scheduledArrival);
        }
        
        // Format fileCreatedDate if it exists
        if (shipmentData.fileCreatedDate) {
          shipmentData.fileCreatedDate = new Date(shipmentData.fileCreatedDate);
        }
      } catch (dateErr) {
        console.error('Error formatting dates:', dateErr.message);
        return res.status(400).json({ 
          errors: [{ msg: 'Invalid date format. Please use ISO format (YYYY-MM-DD)' }] 
        });
      }
      
      const newShipment = new Shipment(shipmentData);

      console.log('Created shipment object:', newShipment);
      
      const shipment = await newShipment.save();
      
      console.log('Saved shipment:', shipment);

      res.json(shipment);
    } catch (err) {
      console.error('Error saving shipment:', err.message);
      
      // Handle mongoose validation errors
      if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors).map(error => ({
          msg: error.message
        }));
        return res.status(400).json({ errors: validationErrors });
      }
      
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/shipments/:id
// @desc    Update a shipment
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    // Update the shipment
    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedShipment);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/shipments/:id
// @desc    Delete a shipment
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    await shipment.remove();

    res.json({ msg: 'Shipment removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// Add this new diagnostic endpoint:
// @route   GET api/shipments/diagnostic/count
// @desc    Get shipment count with detailed diagnostics
// @access  Public
router.get('/diagnostic/count', async (req, res) => {
  try {
    console.log('Running shipment count diagnostic');
    
    // Check MongoDB connection state 
    const dbState = mongoose.connection.readyState;
    const dbStateText = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`Database connection state: ${dbState} (${dbStateText[dbState]})`);
    
    // Check environment
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    
    // Log database connection details (without exposing credentials)
    const dbURI = mongoose.connection.client.s.url || 'Unknown';
    const maskedURI = dbURI.replace(/:\/\/[^@]*@/, '://****:****@');
    console.log(`MongoDB URI (masked): ${maskedURI}`);
    
    // Get counts of various collections
    const shipmentCount = await Shipment.countDocuments();
    const customerCount = await mongoose.model('customer').countDocuments();
    const userCount = await mongoose.model('user').countDocuments();
    
    // Return diagnostic data
    return res.json({
      database: {
        state: dbState,
        stateText: dbStateText[dbState],
        uri: maskedURI,
        connectionName: mongoose.connection.name || 'Unknown'
      },
      collections: {
        shipments: shipmentCount,
        customers: customerCount,
        users: userCount
      },
      environment: process.env.NODE_ENV || 'Unknown'
    });
  } catch (err) {
    console.error('Diagnostic error:', err.message);
    return res.status(500).json({ error: 'Diagnostic error', message: err.message });
  }
});

module.exports = router; 