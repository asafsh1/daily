const jwt = require('jsonwebtoken');
const config = require('config');

// Helper function to add CORS headers
const addCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'https://veleka-shipments-daily-report.netlify.app',
        'https://daily-shipments.netlify.app',
        'https://daily-tracking.netlify.app',
        'https://daily-admin.netlify.app',
        'http://localhost:3000'
      ];

  // Always add CORS headers for all environments
  if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin.endsWith('.netlify.app') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, Origin, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
};

// Helper function to verify token
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    return { isValid: true, user: decoded.user };
  } catch (err) {
    return { isValid: false, error: err.message };
  }
};

module.exports = async function (req, res, next) {
  console.log('Auth middleware called...');
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Add CORS headers for all requests
  addCorsHeaders(req, res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Check for special debug header for development use
  if (process.env.NODE_ENV !== 'production' && req.headers['x-debug-auth'] === 'bypass-auth') {
    console.log('Debug auth bypass detected, skipping authentication');
    req.user = {
      id: 'debug-admin',
      name: 'Debug Admin',
      email: 'debug@example.com',
      role: 'admin'
    };
    return next();
  }
  
  // Get token from header, cookie, or Authorization header
  const token = req.cookies?.token || 
                req.header('x-auth-token') || 
                req.header('Authorization')?.replace('Bearer ', '');
  
  console.log('Session token:', token ? 'Present' : 'Not present');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded.user;
    
    // Refresh token if it's about to expire
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeToExpire = tokenExp - now;
    
    // If token will expire in less than 1 hour, refresh it
    if (timeToExpire < 3600000) {
      const newToken = jwt.sign(
        { user: decoded.user },
        config.get('jwtSecret'),
        { expiresIn: config.get('jwtExpiration') || '1d' }
      );
      
      // Set new token in cookie
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none', // Changed from 'lax' to 'none' for cross-site requests
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      // Also send token in header for API clients
      res.header('x-auth-token', newToken);
    }
    
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.clearCookie('token');
    res.status(401).json({ msg: 'Token is not valid' });
  }
}; 

// Check if user is admin or manager middleware
module.exports.checkAdmin = function(req, res, next) {
  // Add CORS headers
  addCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // User must already be authenticated
  if (!req.user) {
    return res.status(401).json({ msg: 'Authentication required' });
  }
  
  // Check if user has admin or manager role
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  
  // If we get here, user doesn't have required role
  console.log(`Access denied: user ${req.user.id} with role ${req.user.role} attempted to access admin resource`);
  return res.status(403).json({ msg: 'Access denied: Admin or Manager role required' });
}; 