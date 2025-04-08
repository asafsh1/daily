const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// Get the appropriate auth middleware based on environment
const authMiddleware = process.env.NODE_ENV === 'production' 
  ? require('../../middleware/auth') 
  : require('../../middleware/devAuth');

const Customer = require('../../models/Customer');

// @route    GET api/customers
// @desc     Get all customers
// @access   Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/customers/:id
// @desc     Get customer by ID
// @access   Private
router.get('/:id', authMiddleware, async (req, res) => {
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
    res.status(500).send('Server Error');
  }
});

// @route    POST api/customers
// @desc     Create a customer
// @access   Private
router.post(
  '/',
  [
    authMiddleware,
    [
      check('name', 'Name is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/customers/:id
// @desc     Update a customer
// @access   Private
router.put('/:id', authMiddleware, async (req, res) => {
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/customers/:id
// @desc     Delete a customer
// @access   Private (Admin/Manager only)
router.delete('/:id', authMiddleware, async (req, res) => {
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
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 