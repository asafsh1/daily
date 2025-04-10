const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { checkConnectionState } = require('../../mongodb-connect');
const fs = require('fs');
const path = require('path');

const Airline = require('../../models/Airline');

// Function to load sample data if database is not available
const getSampleAirlines = () => {
  try {
    const sampleDataPath = path.join(__dirname, '../../data/sample-airlines.json');
    if (fs.existsSync(sampleDataPath)) {
      console.log('Loading sample airlines data from file');
      const data = fs.readFileSync(sampleDataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading sample airlines data:', err.message);
  }
  return [];
};

// @route    GET api/airlines
// @desc     Get all airlines
// @access   Private
router.get('/', auth, checkConnectionState, async (req, res) => {
  try {
    const airlines = await Airline.find().sort({ name: 1 });
    res.json(airlines);
  } catch (err) {
    console.error('Error fetching airlines:', err.message);
    
    // If there's an error, try to use sample data as a fallback
    try {
      const sampleData = getSampleAirlines();
      if (sampleData && sampleData.length > 0) {
        console.log(`Returning ${sampleData.length} sample airlines due to DB error`);
        return res.json(sampleData);
      }
    } catch (sampleErr) {
      console.error('Also failed to load sample data:', sampleErr.message);
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    GET api/airlines/:id
// @desc     Get airline by ID
// @access   Private
router.get('/:id', auth, checkConnectionState, async (req, res) => {
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
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    GET api/airlines/code/:code
// @desc     Get airline by code
// @access   Private
router.get('/code/:code', auth, checkConnectionState, async (req, res) => {
  try {
    const airline = await Airline.findOne({ code: req.params.code });
    
    if (!airline) {
      // Try to find in fallback data
      const sampleAirlines = getSampleAirlines();
      const fallbackAirline = sampleAirlines.find(a => a.code.toLowerCase() === req.params.code.toLowerCase());
      
      if (fallbackAirline) {
        console.log(`Returning fallback airline data for code: ${req.params.code}`);
        return res.json(fallbackAirline);
      }
      
      return res.status(404).json({ msg: 'Airline not found' });
    }

    res.json(airline);
  } catch (err) {
    console.error(`Error fetching airline by code ${req.params.code}:`, err.message);
    
    // Try fallback data on error
    try {
      const sampleAirlines = getSampleAirlines();
      const fallbackAirline = sampleAirlines.find(a => a.code.toLowerCase() === req.params.code.toLowerCase());
      
      if (fallbackAirline) {
        console.log(`Returning fallback airline data for code: ${req.params.code} after DB error`);
        return res.json(fallbackAirline);
      }
    } catch (sampleErr) {
      console.error('Also failed to load sample data:', sampleErr.message);
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    POST api/airlines
// @desc     Create an airline
// @access   Private
router.post('/', [
  auth,
  checkConnectionState,
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
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    POST api/airlines/bulk
// @desc     Create multiple airlines
// @access   Private
router.post('/bulk', auth, checkConnectionState, async (req, res) => {
  try {
    const airlines = await Airline.insertMany(req.body, { ordered: false });
    res.json(airlines);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Some airline codes already exist' });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    PUT api/airlines/:id
// @desc     Update an airline
// @access   Private
router.put('/:id', auth, checkConnectionState, async (req, res) => {
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
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    DELETE api/airlines/:id
// @desc     Delete an airline
// @access   Private
router.delete('/:id', auth, checkConnectionState, async (req, res) => {
  try {
    const airline = await Airline.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({ msg: 'Airline not found' });
    }

    await airline.remove();
    res.json({ msg: 'Airline removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router; 