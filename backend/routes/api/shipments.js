const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Shipment = require('../../models/Shipment');
const ShipmentLeg = require('../../models/ShipmentLeg');

// @route   GET api/shipments
// @desc    Get all shipments
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('Processing shipments request');
    
    // Check database connection - if not connected, return empty data
    if (mongoose.connection.readyState !== 1) {
      console.error('Database connection is not ready. Current state:', mongoose.connection.readyState);
      
      return res.json({
        shipments: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 1
        }
      });
    }
    
    try {
      console.log('Fetching all shipments');
      const shipments = await Shipment.find()
        .sort({ dateAdded: -1 })
        .lean();
      
      console.log(`Found ${shipments.length} shipments`);
      
      // Get shipment legs for all shipments
      const allLegs = await ShipmentLeg.find()
        .sort({ legOrder: 1 })
        .lean();
      
      console.log(`Found ${allLegs.length} total legs`);
      
      // Organize legs by shipment ID
      const legsByShipment = allLegs.reduce((acc, leg) => {
        const shipmentId = leg.shipmentId.toString();
        if (!acc[shipmentId]) {
          acc[shipmentId] = [];
        }
        acc[shipmentId].push(leg);
        return acc;
      }, {});
      
      // Process each shipment to format properly
      const processedShipments = await Promise.all(shipments.map(async (shipment) => {
        const shipmentId = shipment._id.toString();
        const shipmentLegs = legsByShipment[shipmentId] || [];
        
        // Sort legs by order
        shipmentLegs.sort((a, b) => a.legOrder - b.legOrder);
        
        // Calculate departure and arrival times
        let departureTime = null;
        let arrivalTime = null;
        
        if (shipmentLegs.length === 1) {
          // If single leg, use its departure and arrival
          departureTime = shipmentLegs[0].departureTime;
          arrivalTime = shipmentLegs[0].arrivalTime;
        } else if (shipmentLegs.length > 1) {
          // If multiple legs, use first leg departure and last leg arrival
          departureTime = shipmentLegs[0].departureTime;
          arrivalTime = shipmentLegs[shipmentLegs.length - 1].arrivalTime;
        }
        
        // Process customer field to handle both string and ObjectId references
        let customerDisplay = shipment.customer;
        if (typeof shipment.customer === 'string' && shipment.customer.length > 24) {
          console.log('Processing ObjectId string customer:', shipment.customer);
          // Try to fetch the actual customer by ID
          try {
            const customerDoc = await mongoose.model('customer').findById(shipment.customer);
            if (customerDoc) {
              customerDisplay = { 
                _id: customerDoc._id, 
                name: customerDoc.name 
              };
              console.log('Found customer name:', customerDoc.name);
            } else {
              customerDisplay = { _id: shipment.customer, name: 'Unknown' };
              console.log('Customer not found for ID:', shipment.customer);
            }
          } catch (err) {
            console.error('Error looking up customer:', err.message);
            customerDisplay = { _id: shipment.customer, name: 'Unknown' };
          }
        } else if (typeof shipment.customer === 'string') {
          customerDisplay = { name: shipment.customer };
        } else if (shipment.customer && typeof shipment.customer === 'object') {
          // It's already an object but might not have been populated
          if (!shipment.customer.name && mongoose.Types.ObjectId.isValid(shipment.customer._id)) {
            try {
              const customerDoc = await mongoose.model('customer').findById(shipment.customer._id);
              if (customerDoc) {
                customerDisplay = { 
                  _id: customerDoc._id, 
                  name: customerDoc.name 
                };
              }
            } catch (err) {
              console.error('Error looking up customer from object:', err.message);
            }
          }
        }
        
        return {
          ...shipment,
          legs: shipmentLegs,
          customer: customerDisplay,
          scheduledDeparture: departureTime,
          scheduledArrival: arrivalTime
        };
      }));
      
      // Calculate total
      const total = processedShipments.length;
      
      return res.json({
        shipments: processedShipments,
        pagination: {
          total,
          page: 1,
          pages: 1
        }
      });
    } catch (queryErr) {
      console.error('Error in main query:', queryErr.message);
      
      // If the error is due to customer ObjectId casting, try a fallback approach
      if (queryErr.message && queryErr.message.includes('Cast to ObjectId failed')) {
        console.log('Detected customer casting error, using fallback query');
        
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
      // Generate serial number (format: SHP-YYYY-XXXX)
      const currentYear = new Date().getFullYear();
      
      // Find the highest serial number for this year
      const latestShipment = await Shipment.findOne(
        { serialNumber: new RegExp(`SHP-${currentYear}-\\d+`) },
        { serialNumber: 1 }
      ).sort({ serialNumber: -1 });
      
      let nextNumber = 1;
      if (latestShipment && latestShipment.serialNumber) {
        const parts = latestShipment.serialNumber.split('-');
        if (parts.length === 3) {
          nextNumber = parseInt(parts[2], 10) + 1;
        }
      }
      
      // Format with leading zeros (e.g., SHP-2023-0001)
      const serialNumber = `SHP-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
      
      // Ensure dates are properly formatted
      let shipmentData = {...req.body, serialNumber};
      
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

// @route   PUT api/shipments/generate-serials
// @desc    Generate serial numbers for all shipments without one
// @access  Public
router.put('/generate-serials', async (req, res) => {
  try {
    console.log('Starting serial number generation for existing shipments');
    
    // Find all shipments without serial numbers
    const shipmentsWithoutSerials = await Shipment.find(
      { serialNumber: { $exists: false } }
    ).sort({ dateAdded: 1 });
    
    console.log(`Found ${shipmentsWithoutSerials.length} shipments without serial numbers`);
    
    if (shipmentsWithoutSerials.length === 0) {
      return res.json({ message: 'No shipments need serial numbers', count: 0 });
    }
    
    // Group shipments by year
    const shipmentsByYear = {};
    shipmentsWithoutSerials.forEach(shipment => {
      const year = new Date(shipment.dateAdded).getFullYear();
      if (!shipmentsByYear[year]) {
        shipmentsByYear[year] = [];
      }
      shipmentsByYear[year].push(shipment);
    });
    
    // Process each year
    const results = [];
    for (const year of Object.keys(shipmentsByYear)) {
      console.log(`Processing ${shipmentsByYear[year].length} shipments from ${year}`);
      
      // Find highest serial for this year
      const latestShipment = await Shipment.findOne(
        { serialNumber: new RegExp(`SHP-${year}-\\d+`) },
        { serialNumber: 1 }
      ).sort({ serialNumber: -1 });
      
      let nextNumber = 1;
      if (latestShipment && latestShipment.serialNumber) {
        const parts = latestShipment.serialNumber.split('-');
        if (parts.length === 3) {
          nextNumber = parseInt(parts[2], 10) + 1;
        }
      }
      
      // Update each shipment
      for (const shipment of shipmentsByYear[year]) {
        const serialNumber = `SHP-${year}-${nextNumber.toString().padStart(4, '0')}`;
        await Shipment.findByIdAndUpdate(
          shipment._id,
          { $set: { serialNumber } }
        );
        
        results.push({
          id: shipment._id,
          serialNumber
        });
        
        nextNumber++;
      }
    }
    
    console.log(`Successfully generated ${results.length} serial numbers`);
    
    res.json({
      message: `Generated serial numbers for ${results.length} shipments`,
      count: results.length,
      results
    });
  } catch (err) {
    console.error('Error generating serial numbers:', err);
    res.status(500).json({ 
      error: 'Failed to generate serial numbers',
      message: err.message
    });
  }
});

module.exports = router; 