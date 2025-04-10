const jwt = require('jsonwebtoken');
const config = require('config');

// Helper function to add CORS headers
const addCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://veleka-shipments-daily-report.netlify.app',
    'https://daily-shipments.netlify.app',
    'https://daily-tracking.netlify.app',
    'https://daily-admin.netlify.app',
    'http://localhost:3000'
  ];

  if (process.env.NODE_ENV !== 'production' || !origin || allowedOrigins.includes(origin) || origin.endsWith('.netlify.app')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }
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
  
  // Add CORS headers for all requests
  addCorsHeaders(req, res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Get token from cookie
  const token = req.cookies?.token;
  
  console.log('Session token:', token ? 'Present' : 'Not present');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded.user;
    next();
  } catch (err) {
    // Clear invalid cookie
    res.clearCookie('token');
    res.status(401).json({ msg: 'Token is not valid' });
  }
}; 