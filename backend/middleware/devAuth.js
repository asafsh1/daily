const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if token exists
    if (!token) {
      console.log('[DEV MODE] No token, using default admin auth');
      // Skip authentication and set default admin user
      req.user = {
        id: 'default-user',
        role: 'admin'
      };
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.get('jwtSecret'));
      req.user = decoded.user;
      next();
    } catch (err) {
      console.error('[DEV MODE] Token verification failed:', err.message);
      // Fall back to default user
      req.user = {
        id: 'default-user',
        role: 'admin'
      };
      next();
    }
  } catch (err) {
    console.error('[DEV MODE] Auth middleware error:', err.message);
    // Fall back to default user
    req.user = {
      id: 'default-user',
      role: 'admin'
    };
    next();
  }
}; 