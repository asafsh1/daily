const fs = require('fs');
const path = require('path');

// Create directory if it doesn't exist
const routesDir = path.join(__dirname, '..', 'routes', 'api');
if (!fs.existsSync(routesDir)) {
  console.log(`Creating directory: ${routesDir}`);
  fs.mkdirSync(routesDir, { recursive: true });
}

// Profile route content
const profileRouteContent = `const express = require('express');
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
`;

// Write the profile route file
const profileRoutePath = path.join(routesDir, 'profile.js');
fs.writeFileSync(profileRoutePath, profileRouteContent);

console.log(`Profile route created at: ${profileRoutePath}`); 