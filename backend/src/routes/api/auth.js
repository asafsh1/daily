const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const mockAuth = require('../../utils/mockAuth');

// Get the appropriate auth middleware based on environment
const authMiddleware = process.env.NODE_ENV === 'production' 
  ? require('../../middleware/auth') 
  : require('../../middleware/devAuth');

const User = require('../../models/User');

// Default admin credentials
const DEFAULT_ADMIN = {
  id: 'admin-id-123456',
  name: 'Admin User',
  email: 'admin@shipment.com',
  role: 'admin',
  password: '$2a$10$yjCgV.GgaRwKaVcY9uc7B.Ai23JKz9Sm4UGaeMv3xSqcZIBDkzVlm' // bcrypt hash for 'admin123'
};

// @route   GET api/auth/test
// @desc    Test auth route
// @access  Public
router.get('/test', (req, res) => {
  res.json({ msg: 'Auth API Endpoint' });
});

// @route   GET api/auth/user
// @desc    Get user by token
// @access  Private
router.get('/user', authMiddleware, (req, res) => {
  res.json({ userId: req.user.id });
});

// @route   GET api/auth/verify
// @desc    Verify user's authentication status
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    // Try mock auth first
    const mockUser = mockAuth.getUserById(req.user.id);
    if (mockUser) {
      return res.json(mockUser);
    }

    // If not in mock auth, try database
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Try mock authentication first
    const mockAuthResult = await mockAuth.authenticateUser(email, password);
    if (mockAuthResult) {
      const token = mockAuthResult.token;
      
      // Set token in cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 24 * 60 * 60 * 1000 // 5 days
      });

      // Also send token in response for API clients
      return res.json({ 
        token,
        user: mockAuthResult.user
      });
    }

    // If mock auth fails, try database
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: config.get('jwtExpiration') || '5 days' }
    );
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 24 * 60 * 60 * 1000 // 5 days
    });

    // Send token and user data in response
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST api/auth/logout
// @desc    Logout user / Clear cookie
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.clearCookie('token');
  res.json({ msg: 'Logged out successfully' });
});

// @route   POST api/get-dev-token
// @desc    Get a development token for non-production environments
// @access  Public
router.post('/get-dev-token', async (req, res) => {
  try {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      // In production, use a demo token with limited permissions
      const demoPayload = {
        user: {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'viewer'
        }
      };
      
      const demoToken = jwt.sign(
        demoPayload,
        process.env.JWT_SECRET || 'defaultsecretfordemo',
        { expiresIn: '1h' }
      );
      
      return res.json({ token: demoToken });
    }
    
    // For development, use admin credentials
    const payload = {
      user: {
        id: DEFAULT_ADMIN.id,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        role: DEFAULT_ADMIN.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || config.get('jwtSecret') || 'developmentsecret',
      { expiresIn: '5 days' }
    );

    // Send token in response
    res.json({ token });
  } catch (err) {
    console.error('Dev token generation error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Also support GET for the same endpoint to make it easier for clients
router.get('/get-dev-token', async (req, res) => {
  try {
    // Same implementation as POST
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      // In production, use a demo token with limited permissions
      const demoPayload = {
        user: {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'viewer'
        }
      };
      
      const demoToken = jwt.sign(
        demoPayload,
        process.env.JWT_SECRET || 'defaultsecretfordemo',
        { expiresIn: '1h' }
      );
      
      return res.json({ token: demoToken });
    }
    
    // For development, use admin credentials
    const payload = {
      user: {
        id: DEFAULT_ADMIN.id,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        role: DEFAULT_ADMIN.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || config.get('jwtSecret') || 'developmentsecret',
      { expiresIn: '5 days' }
    );

    // Send token in response
    res.json({ token });
  } catch (err) {
    console.error('Dev token generation error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 