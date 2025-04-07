const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');

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
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, using sample data');
      return res.json(getSampleShipments());
    }
    
    // Database connected, try to fetch real data
    let shipments = await Shipment.find().sort({ date: -1 });
    
    // If no shipments in database, use sample data
    if (shipments.length === 0) {
      console.log('No shipments found in database, using sample data');
      shipments = getSampleShipments();
    }
    
    res.json(shipments);
  } catch (err) {
    console.error(err.message);
    
    // If error occurs, try to return sample data
    const sampleData = getSampleShipments();
    if (sampleData.length > 0) {
      console.log('Error fetching shipments, falling back to sample data');
      return res.json(sampleData);
    }
    
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipments/repair-legs/:id
// @desc    Special endpoint to fix legs for a shipment
// @access  Public
router.get('/repair-legs/:id', async (req, res) => {
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
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, using sample data');
      const sampleData = getSampleShipments();
      const shipment = sampleData.find(s => s._id === req.params.id);
      
      if (!shipment) {
        return res.status(404).json({ msg: 'Shipment not found in sample data' });
      }
      
      return res.json(shipment);
    }
    
    // First check for valid ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid shipment ID format' });
    }
    
    // Try to find the shipment directly
    const shipment = await Shipment.findById(req.params.id);
    
    if (!shipment) {
      // If not found in database, check sample data
      const sampleData = getSampleShipments();
      const sampleShipment = sampleData.find(s => s._id === req.params.id);
      
      if (sampleShipment) {
        return res.json(sampleShipment);
      }
      
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    
    // Populate customer data if it's an ObjectId reference
    if (shipment.customer && mongoose.Types.ObjectId.isValid(shipment.customer)) {
      const populatedShipment = await Shipment.findById(req.params.id)
        .populate('customer', 'name email')
        .lean();
        
      return res.json(populatedShipment);
    }

    // Add legs to the response if the shipment has them
    if (shipment.legs && Array.isArray(shipment.legs) && shipment.legs.length > 0) {
      try {
        // Find all legs for this shipment
        const shipmentLegs = await ShipmentLeg.find({ 
          shipment: shipment._id 
        }).sort({ legOrder: 1 });
        
        // If we have legs in both places, use the newer leg collection data
        if (shipmentLegs && shipmentLegs.length > 0) {
          // Return the shipment with leg data directly
          const shipmentWithLegs = shipment.toObject();
          shipmentWithLegs.legs = shipmentLegs;
          return res.json(shipmentWithLegs);
        }
      } catch (err) {
        console.error('Error fetching legs for shipment:', err);
        // Continue with normal shipment return if leg fetch fails
      }
    }

    // Return the standard shipment data
    res.json(shipment);
  } catch (err) {
    console.error(err.message);
    
    // If error occurs, try to return sample data
    try {
      const sampleData = getSampleShipments();
      const shipment = sampleData.find(s => s._id === req.params.id);
      
      if (shipment) {
        console.log('Error fetching shipment, falling back to sample data');
        return res.json(shipment);
      }
    } catch (sampleErr) {
      console.error('Error with sample data fallback:', sampleErr.message);
      }
      
      res.status(500).send('Server Error');
  }
});

// @route   GET api/shipments/:id/legs
// @desc    Get legs for a specific shipment
// @access  Public
router.get('/:id/legs', async (req, res) => {
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

module.exports = router; 
