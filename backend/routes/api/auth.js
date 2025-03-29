const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const mockAuth = require('../../utils/mockAuth');

const User = require('../../models/User');

// Default admin credentials
const DEFAULT_ADMIN = {
  id: 'admin-id-123456',
  name: 'Admin User',
  email: 'admin@shipment.com',
  role: 'admin',
  password: '$2a$10$yjCgV.GgaRwKaVcY9uc7B.Ai23JKz9Sm4UGaeMv3xSqcZIBDkzVlm' // bcrypt hash for 'admin123'
};

// @route   GET api/auth
// @desc    Test auth route
// @access  Public
router.get('/', (req, res) => {
  res.json({ msg: 'Auth API Endpoint' });
});

// @route   GET api/auth/user
// @desc    Get user by token
// @access  Private
router.get('/user', auth, (req, res) => {
  res.json({ userId: req.user.id });
});

// @route   GET api/auth
// @desc    Get user by token
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // First try to get user from mock auth
    const mockUser = mockAuth.getUserById(req.user.id);
    if (mockUser) {
      return res.json(mockUser);
    }

    // If not found in mock auth, try database
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // First try mock authentication
      const mockAuthResult = await mockAuth.authenticateUser(email, password);
      if (mockAuthResult) {
        return res.json(mockAuthResult);
      }

      // If mock auth fails, try database
      let user = await User.findOne({ email });

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router; 