const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Airline = require('../../models/Airline');

// @route    GET api/airlines
// @desc     Get all airlines
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const airlines = await Airline.find().sort({ name: 1 });
    res.json(airlines);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/airlines/:id
// @desc     Get airline by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const airline = await Airline.findById(req.params.id);
    
    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    res.json(airline);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Airline not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    GET api/airlines/code/:code
// @desc     Get airline by code
// @access   Private
router.get('/code/:code', auth, async (req, res) => {
  try {
    const airline = await Airline.findOne({ code: req.params.code });
    
    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    res.json(airline);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/airlines
// @desc     Create an airline
// @access   Private (Admin only)
router.post(
  '/',
  [
    auth,
    [
      check('code', 'Airline code is required').not().isEmpty(),
      check('name', 'Airline name is required').not().isEmpty(),
      check('trackingUrlTemplate', 'Tracking URL template is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(401).json({ msg: 'Not authorized to create airlines' });
      }

      const { code, name, trackingUrlTemplate, trackingInstructions, active } = req.body;

      // Check if airline with the same code already exists
      const existingAirline = await Airline.findOne({ code });
      if (existingAirline) {
        return res.status(400).json({ errors: [{ msg: 'Airline with this code already exists' }] });
      }

      const airline = new Airline({
        code,
        name,
        trackingUrlTemplate,
        trackingInstructions,
        active: active !== undefined ? active : true
      });

      await airline.save();
      res.json(airline);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/airlines/:id
// @desc     Update an airline
// @access   Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to update airlines' });
    }

    const { code, name, trackingUrlTemplate, trackingInstructions, active } = req.body;

    // Build airline object
    const airlineFields = {};
    if (code) airlineFields.code = code;
    if (name) airlineFields.name = name;
    if (trackingUrlTemplate) airlineFields.trackingUrlTemplate = trackingUrlTemplate;
    if (trackingInstructions !== undefined) airlineFields.trackingInstructions = trackingInstructions;
    if (active !== undefined) airlineFields.active = active;
    airlineFields.updatedAt = Date.now();

    // Update
    let airline = await Airline.findById(req.params.id);

    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    airline = await Airline.findByIdAndUpdate(
      req.params.id,
      { $set: airlineFields },
      { new: true }
    );

    res.json(airline);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/airlines/:id
// @desc     Delete an airline
// @access   Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only allow admin to delete airlines
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to delete airlines' });
    }

    const airline = await Airline.findById(req.params.id);

    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    await airline.remove();
    res.json({ msg: 'Airline removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Airline not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 