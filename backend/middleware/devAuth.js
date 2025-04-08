const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  console.log('[DEV AUTH] Middleware called');
  
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    console.log('[DEV AUTH] Token received:', token ? 'Yes (token present)' : 'No token');
    
    // Check if token exists
    if (!token) {
      console.log('[DEV AUTH] No token, using default admin auth');
      // Skip authentication and set default admin user
      req.user = {
        id: 'default-user',
        role: 'admin'
      };
      return next();
    }
    
    // If token is the default dev token, use default user
    if (token === 'default-dev-token') {
      console.log('[DEV AUTH] Using default dev token');
      req.user = {
        id: 'default-user',
        role: 'admin'
      };
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.get('jwtSecret'));
      console.log('[DEV AUTH] Token verification successful, user ID:', decoded.user.id);
      req.user = decoded.user;
      next();
    } catch (err) {
      console.error('[DEV AUTH] Token verification failed:', err.message);
      // Fall back to default user
      req.user = {
        id: 'default-user',
        role: 'admin'
      };
      next();
    }
  } catch (err) {
    console.error('[DEV AUTH] Auth middleware error:', err.message);
    // Fall back to default user
    req.user = {
      id: 'default-user',
      role: 'admin'
    };
    next();
  }
}; 