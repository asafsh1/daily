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
// @access   Private
router.post('/', [
  auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('code', 'Code is required').not().isEmpty(),
    check('trackingUrlTemplate', 'Tracking URL template is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newAirline = new Airline({
      name: req.body.name,
      code: req.body.code,
      trackingUrlTemplate: req.body.trackingUrlTemplate,
      status: req.body.status || 'active'
    });

    const airline = await newAirline.save();
    res.json(airline);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Airline code already exists' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    POST api/airlines/bulk
// @desc     Create multiple airlines
// @access   Private
router.post('/bulk', auth, async (req, res) => {
  try {
    const airlines = await Airline.insertMany(req.body, { ordered: false });
    res.json(airlines);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Some airline codes already exist' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/airlines/:id
// @desc     Update an airline
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    const airline = await Airline.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    const { name, code, trackingUrlTemplate, status } = req.body;
    airline.name = name;
    airline.code = code;
    airline.trackingUrlTemplate = trackingUrlTemplate;
    airline.status = status;

    await airline.save();
    res.json(airline);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Airline code already exists' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/airlines/:id
// @desc     Delete an airline
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const airline = await Airline.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    await airline.remove();
    res.json({ msg: 'Airline removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 