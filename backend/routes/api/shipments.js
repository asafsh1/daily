const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const Shipment = require('../../models/Shipment');

// @route   GET api/shipments
// @desc    Get all shipments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ dateAdded: -1 });
    res.json(shipments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shipments/:id
// @desc    Get shipment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    res.json(shipment);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipment not found' });
    }
    res.status(500).send('Server Error');
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
    check('customer', 'Customer is required').not().isEmpty(),
    check('awbNumber1', 'AWB number is required').not().isEmpty(),
    check('routing', 'Routing is required').not().isEmpty(),
    check('scheduledArrival', 'Scheduled arrival is required').not().isEmpty()
  ],
  async (req, res) => {
    console.log('Received shipment data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newShipment = new Shipment({
        ...req.body
      });

      console.log('Created shipment object:', newShipment);
      
      const shipment = await newShipment.save();
      
      console.log('Saved shipment:', shipment);

      res.json(shipment);
    } catch (err) {
      console.error('Error saving shipment:', err.message);
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

module.exports = router; 