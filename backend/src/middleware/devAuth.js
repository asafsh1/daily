const jwt = require('jsonwebtoken');
const config = require('config');
const { DEFAULT_ADMIN } = require('../utils/mockAuth');

module.exports = function (req, res, next) {
  console.log('[DEV AUTH] Middleware called');
  
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    console.log('[DEV AUTH] Token received:', token ? token.substring(0, 10) + '...' : 'No token');
    
    // Check if token exists
    if (!token) {
      console.log('[DEV AUTH] No token, using default admin auth');
      // Skip authentication and set default admin user
      req.user = {
        id: DEFAULT_ADMIN.id,
        role: DEFAULT_ADMIN.role
      };
      return next();
    }
    
    // If token is the default dev token, use default user
    if (token === 'default-dev-token') {
      console.log('[DEV AUTH] Using default dev token');
      req.user = {
        id: DEFAULT_ADMIN.id,
        role: DEFAULT_ADMIN.role
      };
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.get('jwtSecret'));
      console.log('[DEV AUTH] Token verification successful, user ID:', decoded.user.id);
      req.user = decoded.user;
      return next();
    } catch (err) {
      console.error('[DEV AUTH] Token verification failed:', err.message);
      
      // Check if it's just expired but otherwise valid
      try {
        const decoded = jwt.verify(token, config.get('jwtSecret'), { ignoreExpiration: true });
        console.log('[DEV AUTH] Token expired but otherwise valid, using decoded user');
        req.user = decoded.user;
        return next();
      } catch (innerErr) {
        console.error('[DEV AUTH] Token is invalid:', innerErr.message);
        // Fall back to default user
        req.user = {
          id: DEFAULT_ADMIN.id,
          role: DEFAULT_ADMIN.role
        };
        return next();
      }
    }
  } catch (err) {
    console.error('[DEV AUTH] Auth middleware error:', err.message);
    // Fall back to default user
    req.user = {
      id: DEFAULT_ADMIN.id,
      role: DEFAULT_ADMIN.role
    };
    return next();
  }
}; 