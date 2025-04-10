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
  
  // Check for session token in cookies
  const token = req.cookies?.token;
  
  console.log('Session token:', token ? 'Present' : 'Not present');
  
  // Check if no token
  if (!token) {
    // In development, create a default token
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Creating default admin session');
      const payload = {
        user: {
          id: 'admin-id-123456',
          role: 'admin'
        }
      };
      
      const devToken = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '7d' });
      req.user = payload.user;
      
      // Set session cookie
      res.cookie('token', devToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return next();
    }
    
    console.log('No session token found, authorization denied');
    return res.status(401).json({ 
      msg: 'Session expired or invalid',
      shouldRefresh: true
    });
  }

  // Verify token
  const { isValid, user, error } = await verifyToken(token);
  
  if (!isValid) {
    console.error('Session verification failed:', error);
    
    // Clear invalid session cookie
    res.clearCookie('token');
    
    return res.status(401).json({ 
      msg: 'Session expired or invalid',
      error,
      shouldRefresh: true
    });
  }
  
  console.log('Session verification successful, user ID:', user.id);
  req.user = user;
  next();
}; 