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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, Origin, Accept');
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
  
  // Get token from various sources
  const token = 
    req.header('x-auth-token') || 
    (req.headers.authorization || '').replace('Bearer ', '') ||
    (req.cookies && req.cookies.token);
  
  console.log('Token received:', token ? 'Yes (token present)' : 'No token');
  
  // Check if no token
  if (!token) {
    // In development, create a default token
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Creating default admin token');
      const payload = {
        user: {
          id: 'admin-id-123456',
          role: 'admin'
        }
      };
      
      const devToken = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '7d' });
      req.user = payload.user;
      
      // Set token in response headers
      res.header('x-auth-token', devToken);
      
      return next();
    }
    
    console.log('No token provided, authorization denied');
    return res.status(401).json({ 
      msg: 'No token, authorization denied',
      shouldRefresh: true
    });
  }

  // Verify token
  const { isValid, user, error } = await verifyToken(token);
  
  if (!isValid) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ 
      msg: 'Token is not valid',
      error,
      shouldRefresh: true
    });
  }
  
  console.log('Token verification successful, user ID:', user.id);
  req.user = user;
  next();
}; 