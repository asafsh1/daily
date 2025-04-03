const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Shipper = require('../../models/Shipper');

// @route   GET api/shippers
// @desc    Get all shippers
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const shippers = await Shipper.find().sort({ name: 1 });
    res.json(shippers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shippers/:id
// @desc    Get shipper by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const shipper = await Shipper.findById(req.params.id);
    
    if (!shipper) {
      return res.status(404).json({ msg: 'Shipper not found' });
    }
    
    res.json(shipper);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipper not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shippers
// @desc    Create a shipper
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('shipperId', 'Shipper ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, shipperId, address, contact, email, phone, notes } = req.body;

      // Check if shipper with the same ID already exists
      let shipper = await Shipper.findOne({ shipperId });
      if (shipper) {
        return res.status(400).json({ msg: 'Shipper with this ID already exists' });
      }

      // Create new shipper
      shipper = new Shipper({
        name,
        shipperId,
        address,
        contact,
        email,
        phone,
        notes
      });

      await shipper.save();
      res.json(shipper);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/shippers/:id
// @desc    Update a shipper
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, shipperId, address, contact, email, phone, notes } = req.body;

    // Build shipper object
    const shipperFields = {};
    if (name) shipperFields.name = name;
    if (shipperId) shipperFields.shipperId = shipperId;
    if (address) shipperFields.address = address;
    if (contact) shipperFields.contact = contact;
    if (email) shipperFields.email = email;
    if (phone) shipperFields.phone = phone;
    if (notes) shipperFields.notes = notes;
    shipperFields.updatedAt = Date.now();

    let shipper = await Shipper.findById(req.params.id);

    if (!shipper) {
      return res.status(404).json({ msg: 'Shipper not found' });
    }

    // Check if updating to an existing shipperId
    if (shipperId && shipperId !== shipper.shipperId) {
      const existingShipper = await Shipper.findOne({ shipperId });
      if (existingShipper) {
        return res.status(400).json({ msg: 'Shipper with this ID already exists' });
      }
    }

    // Update
    shipper = await Shipper.findByIdAndUpdate(
      req.params.id,
      { $set: shipperFields },
      { new: true }
    );

    res.json(shipper);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipper not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/shippers/:id
// @desc    Delete a shipper
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const shipper = await Shipper.findById(req.params.id);

    if (!shipper) {
      return res.status(404).json({ msg: 'Shipper not found' });
    }

    await shipper.remove();
    res.json({ msg: 'Shipper removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shipper not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 