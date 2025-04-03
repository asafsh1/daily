const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const NotifyParty = require('../../models/NotifyParty');

// @route   GET api/notify-parties
// @desc    Get all notify parties
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifyParties = await NotifyParty.find().sort({ name: 1 });
    res.json(notifyParties);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/notify-parties/:id
// @desc    Get notify party by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const notifyParty = await NotifyParty.findById(req.params.id);
    
    if (!notifyParty) {
      return res.status(404).json({ msg: 'Notify party not found' });
    }
    
    res.json(notifyParty);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notify party not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notify-parties
// @desc    Create a notify party
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('notifyPartyId', 'Notify Party ID is required').not().isEmpty()
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
      notifyPartyId
    } = req.body;

    try {
      // Check if notify party with the same ID already exists
      let existingNotifyParty = await NotifyParty.findOne({ notifyPartyId });
      if (existingNotifyParty) {
        return res.status(400).json({ msg: 'Notify party with this ID already exists' });
      }

      const newNotifyParty = new NotifyParty({
        name,
        email,
        phone,
        address,
        contactPerson,
        notes,
        notifyPartyId
      });

      const notifyParty = await newNotifyParty.save();
      res.json(notifyParty);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/notify-parties/:id
// @desc    Update a notify party
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    contactPerson,
    notes,
    notifyPartyId
  } = req.body;

  // Build notify party object
  const notifyPartyFields = {};
  if (name) notifyPartyFields.name = name;
  if (email) notifyPartyFields.email = email;
  if (phone) notifyPartyFields.phone = phone;
  if (address) notifyPartyFields.address = address;
  if (contactPerson) notifyPartyFields.contactPerson = contactPerson;
  if (notes) notifyPartyFields.notes = notes;
  if (notifyPartyId) notifyPartyFields.notifyPartyId = notifyPartyId;

  try {
    let notifyParty = await NotifyParty.findById(req.params.id);

    if (!notifyParty) {
      return res.status(404).json({ msg: 'Notify party not found' });
    }

    // Update
    notifyParty = await NotifyParty.findByIdAndUpdate(
      req.params.id,
      { $set: notifyPartyFields },
      { new: true }
    );

    res.json(notifyParty);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notify party not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/notify-parties/:id
// @desc    Delete a notify party
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notifyParty = await NotifyParty.findById(req.params.id);

    if (!notifyParty) {
      return res.status(404).json({ msg: 'Notify party not found' });
    }

    await notifyParty.remove();
    res.json({ msg: 'Notify party removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notify party not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 