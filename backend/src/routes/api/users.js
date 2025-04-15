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

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
    check('role', 'Role is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
      // Check if email is one of the default users
      const defaultUsers = mockAuth.getAllUsers();
      if (defaultUsers.some(user => user.email === email)) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      // See if user exists in database
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({
        name,
        email,
        password,
        role
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

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

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    // Get mock users
    const mockUsers = mockAuth.getAllUsers();
    
    try {
      // Try to get database users
      const dbUsers = await User.find().select('-password');
      
      // Combine mock and database users
      const allUsers = [...mockUsers, ...dbUsers];
      
      res.json(allUsers);
    } catch (err) {
      // If database fails, just return mock users
      console.error('Database error, returning only mock users:', err.message);
      res.json(mockUsers);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/public
// @desc    Get all users (public)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ name: 1 });
    
    // Filter sensitive data for security
    const safeUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email ? user.email.replace(/^(.)(.*)(@.*)$/, '$1****$3') : '', // Mask email
      isActive: user.isActive
    }));
    
    res.json(safeUsers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', [
  authMiddleware,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('role', 'Role is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { name, email, password, role } = req.body;
    const userId = req.params.id;

    // Check if trying to edit a mock user
    const mockUsers = mockAuth.getAllUsers();
    const isMockUser = mockUsers.some(user => user.id === userId);

    if (isMockUser) {
      return res.status(400).json({ msg: 'Cannot edit default system user' });
    }

    // Find user by id
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update user fields
    user.name = name;
    user.email = email;
    user.role = role;

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json(userWithoutPassword);

  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const userId = req.params.id;

    // Check if trying to delete a mock user
    const mockUsers = mockAuth.getAllUsers();
    const isMockUser = mockUsers.some(user => user.id === userId);

    if (isMockUser) {
      return res.status(400).json({ msg: 'Cannot delete default system user' });
    }

    // Find user by id
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if trying to delete the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ msg: 'Cannot delete the last admin user' });
      }
    }

    await user.remove();
    res.json({ msg: 'User removed' });

  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/test
// @desc    Test route
// @access  Public
router.get('/test', (req, res) => {
  res.json({ msg: 'Users API Endpoint' });
});

module.exports = router; 