const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// @route   GET api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      msg: 'Profile route is working',
      user: req.user
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
