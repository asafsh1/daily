const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { checkConnectionState } = require('../../mongodb-connect');

// Get the appropriate auth middleware based on environment
const authMiddleware = process.env.NODE_ENV === 'production' 
  ? require('../../middleware/auth') 
  : require('../../middleware/devAuth');

const Customer = require('../../models/Customer');

// Function to load sample data if database is not available
const getSampleCustomers = () => {
  try {
    const sampleDataPath = path.join(__dirname, '../../data/sample-customers.json');
    if (fs.existsSync(sampleDataPath)) {
      console.log('Loading sample customers data from file');
      const data = fs.readFileSync(sampleDataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading sample customers data:', err.message);
  }
  
  // Return some hardcoded customers if file doesn't exist
  return [
    {
      "_id": "sample-customer-1",
      "name": "Sample Customer 1",
      "email": "customer1@example.com",
      "contactPerson": "John Doe",
      "phone": "+1234567890",
      "address": "123 Main St, Example City",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    },
    {
      "_id": "sample-customer-2",
      "name": "Sample Customer 2",
      "email": "customer2@example.com",
      "contactPerson": "Jane Smith",
      "phone": "+0987654321",
      "address": "456 Side St, Example City",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ];
};

// @route    GET api/customers
// @desc     Get all customers
// @access   Private
router.get('/', authMiddleware, checkConnectionState, async (req, res) => {
  // Check if database is connected, if not serve fallback data immediately
  if (!req.dbConnected) {
    console.log('Database not connected, using fallback customer data');
    try {
      const sampleData = getSampleCustomers();
      if (sampleData && sampleData.length > 0) {
        console.log(`Returning ${sampleData.length} sample customers as fallback`);
        return res.json(sampleData);
      } else {
        return res.status(503).json({ 
          msg: 'Database connection is currently unavailable and no fallback data could be loaded.',
          connectionState: req.dbConnectionState ? req.dbConnectionState.state : 'unknown'
        });
      }
    } catch (sampleErr) {
      console.error('Failed to load sample customer data:', sampleErr.message);
      return res.status(503).json({ 
        msg: 'Database connection is currently unavailable and fallback data failed to load.',
        error: sampleErr.message 
      });
    }
  }

  // Database is connected, continue with normal operation
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err.message);
    
    // If there's an error, try to use sample data as a fallback
    try {
      const sampleData = getSampleCustomers();
      if (sampleData && sampleData.length > 0) {
        console.log(`Returning ${sampleData.length} sample customers due to DB error`);
        return res.json(sampleData);
      }
    } catch (sampleErr) {
      console.error('Also failed to load sample data:', sampleErr.message);
    }
    
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    GET api/customers/:id
// @desc     Get customer by ID
// @access   Private
router.get('/:id', authMiddleware, checkConnectionState, async (req, res) => {
  // Check if database is connected, if not check fallback data
  if (!req.dbConnected) {
    const sampleCustomers = getSampleCustomers();
    const sampleCustomer = sampleCustomers.find(c => c._id === req.params.id);
    if (sampleCustomer) {
      return res.json(sampleCustomer);
    }
    return res.status(404).json({ msg: 'Customer not found and database is unavailable' });
  }
  
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ msg: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    POST api/customers
// @desc     Create a customer
// @access   Private
router.post(
  '/',
  [
    authMiddleware,
    checkConnectionState,
    [
      check('name', 'Name is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // If database is not connected, return error for create operations
    if (!req.dbConnected) {
      return res.status(503).json({ 
        msg: 'Cannot create customer: Database connection is currently unavailable.',
        errors: [{ msg: 'Database is offline. Please try again later.' }]
      });
    }

    try {
      const { name, contactPerson, email, phone, address, notes } = req.body;

      // Check if customer with the same name already exists
      const existingCustomer = await Customer.findOne({ name });
      if (existingCustomer) {
        return res.status(400).json({ errors: [{ msg: 'Customer already exists' }] });
      }

      const customer = new Customer({
        name,
        contactPerson,
        email,
        phone,
        address,
        notes
      });

      await customer.save();
      res.json(customer);
    } catch (err) {
      console.error('Error creating customer:', err.message);
      res.status(500).json({ 
        msg: 'Server Error', 
        error: err.message,
        errors: [{ msg: err.message }]
      });
    }
  }
);

// @route    PUT api/customers/:id
// @desc     Update a customer
// @access   Private
router.put('/:id', authMiddleware, checkConnectionState, async (req, res) => {
  // If database is not connected, return error for update operations
  if (!req.dbConnected) {
    return res.status(503).json({ 
      msg: 'Cannot update customer: Database connection is currently unavailable.',
      errors: [{ msg: 'Database is offline. Please try again later.' }]
    });
  }

  try {
    const { name, contactPerson, email, phone, address, notes } = req.body;

    // Build customer object
    const customerFields = {};
    if (name) customerFields.name = name;
    if (contactPerson) customerFields.contactPerson = contactPerson;
    if (email) customerFields.email = email;
    if (phone) customerFields.phone = phone;
    if (address) customerFields.address = address;
    if (notes) customerFields.notes = notes;
    customerFields.updatedAt = Date.now();

    // Update
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ msg: 'Customer not found' });
    }

    customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: customerFields },
      { new: true }
    );

    res.json(customer);
  } catch (err) {
    console.error('Error updating customer:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route    DELETE api/customers/:id
// @desc     Delete a customer
// @access   Private (Admin/Manager only)
router.delete('/:id', authMiddleware, checkConnectionState, async (req, res) => {
  // If database is not connected, return error for delete operations
  if (!req.dbConnected) {
    return res.status(503).json({ 
      msg: 'Cannot delete customer: Database connection is currently unavailable.',
      errors: [{ msg: 'Database is offline. Please try again later.' }]
    });
  }

  try {
    // Only allow admin or manager to delete customers
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(401).json({ msg: 'Not authorized to delete customers' });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ msg: 'Customer not found' });
    }

    await customer.remove();
    res.json({ msg: 'Customer removed' });
  } catch (err) {
    console.error('Error deleting customer:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router; 