const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  console.log('Auth middleware called...');
  
  // Get token from header
  const token = req.header('x-auth-token');
  
  console.log('Token received:', token ? 'Yes (token present)' : 'No token');
  
  // Check if no token
  if (!token) {
    console.log('No token provided, authorization denied');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    console.log('Token verification successful, user ID:', decoded.user.id);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
}; 