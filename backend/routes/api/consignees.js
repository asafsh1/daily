const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Consignee = require('../../models/Consignee');

// @route   GET api/consignees
// @desc    Get all consignees
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const consignees = await Consignee.find().sort({ name: 1 });
    res.json(consignees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/consignees/:id
// @desc    Get consignee by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const consignee = await Consignee.findById(req.params.id);
    
    if (!consignee) {
      return res.status(404).json({ msg: 'Consignee not found' });
    }
    
    res.json(consignee);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Consignee not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/consignees
// @desc    Create a consignee
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('consigneeId', 'Consignee ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      address,
      contactPerson,
      notes,
      consigneeId
    } = req.body;

    try {
      // Check if consignee with the same ID already exists
      let existingConsignee = await Consignee.findOne({ consigneeId });
      if (existingConsignee) {
        return res.status(400).json({ msg: 'Consignee with this ID already exists' });
      }

      const newConsignee = new Consignee({
        name,
        email,
        phone,
        address,
        contactPerson,
        notes,
        consigneeId
      });

      const consignee = await newConsignee.save();
      res.json(consignee);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/consignees/:id
// @desc    Update a consignee
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    contactPerson,
    notes,
    consigneeId
  } = req.body;

  // Build consignee object
  const consigneeFields = {};
  if (name) consigneeFields.name = name;
  if (email) consigneeFields.email = email;
  if (phone) consigneeFields.phone = phone;
  if (address) consigneeFields.address = address;
  if (contactPerson) consigneeFields.contactPerson = contactPerson;
  if (notes) consigneeFields.notes = notes;
  if (consigneeId) consigneeFields.consigneeId = consigneeId;

  try {
    let consignee = await Consignee.findById(req.params.id);

    if (!consignee) {
      return res.status(404).json({ msg: 'Consignee not found' });
    }

    // Update
    consignee = await Consignee.findByIdAndUpdate(
      req.params.id,
      { $set: consigneeFields },
      { new: true }
    );

    res.json(consignee);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Consignee not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/consignees/:id
// @desc    Delete a consignee
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const consignee = await Consignee.findById(req.params.id);

    if (!consignee) {
      return res.status(404).json({ msg: 'Consignee not found' });
    }

    await consignee.remove();
    res.json({ msg: 'Consignee removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Consignee not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 