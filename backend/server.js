require('dotenv').config();

// Force using MongoDB Atlas connection string
process.env.MONGODB_URI = "mongodb+srv://asafasaf5347:asafasaf5347@cluster0.lyz67.mongodb.net/shipment-tracker?retryWrites=true&w=majority&appName=Cluster0";

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const config = require('config');
const auth = require('./middleware/auth');
const devAuth = require('./middleware/devAuth');
const User = require('./models/User');
const Shipment = require('./models/Shipment');
const Customer = require('./models/Customer');
const { createServer } = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const mockAuth = require('./utils/mockAuth');

// Read port from environment variable first, then config, then default
const PORT = process.env.PORT || 5001;

// Determine which auth middleware to use based on environment
const authMiddleware = process.env.NODE_ENV === 'production' ? auth : devAuth;
console.log(`Using ${process.env.NODE_ENV === 'production' ? 'STRICT' : 'DEVELOPMENT'} authentication mode`);

// Initialize Express
const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  'https://veleka-shipments-daily-report.netlify.app',
  'https://daily-shipments.netlify.app',
  'https://daily-tracking.netlify.app',
  // Add your Netlify domain here if different
  'https://daily-admin.netlify.app'
];

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production' || !origin) {
      return callback(null, true);
    }
    
    // In production, check against the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      // Allow all origins in case our list is incomplete
      return callback(null, true);
      // To restrict: return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'Accept']
};

// Initialize socket.io with CORS settings
const io = socketIo(httpServer, {
  cors: corsOptions
});

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors(corsOptions));

// Debug logging for all API requests
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} started`);
  
  // Add CORS headers for all requests - ensure they're set properly
  const origin = req.headers.origin;
  
  if (corsOptions.origin === '*' || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, Origin, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Once the request is processed, log the completion and response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} completed with status ${res.statusCode} in ${duration}ms`);
  });
  
  next();
});

// Add a special route to get a development token - this makes it easier for the frontend to get a valid token
app.post('/api/get-dev-token', (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ msg: 'Not found' });
  }
  
  try {
    // Create a token using the default admin user
    const payload = {
      user: {
        id: mockAuth.DEFAULT_ADMIN.id,
        role: mockAuth.DEFAULT_ADMIN.role
      }
    };
    
    jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: '7 days' },  // Longer expiration for development
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: mockAuth.DEFAULT_ADMIN.id,
            name: mockAuth.DEFAULT_ADMIN.name,
            role: mockAuth.DEFAULT_ADMIN.role,
            email: mockAuth.DEFAULT_ADMIN.email
          }
        });
      }
    );
  } catch (err) {
    console.error('Error generating dev token:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder - look in current directory or one level up
  const clientPath = path.resolve(__dirname, 'client', 'build');
  const frontendPath = path.resolve(__dirname, '..', 'frontend', 'build');
  
  // Try to find the build folder in either location
  let staticPath;
  if (fs.existsSync(clientPath)) {
    staticPath = clientPath;
    console.log('Using client/build for static files');
  } else if (fs.existsSync(frontendPath)) {
    staticPath = frontendPath;
    console.log('Using frontend/build for static files');
  }
  
  if (staticPath) {
    console.log(`Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));
  } else {
    console.warn('No static build folder found. API-only mode.');
  }
}

// Define Routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/shipments', require('./routes/api/shipments'));
app.use('/api/customers', require('./routes/api/customers'));
app.use('/api/airlines', require('./routes/api/airlines'));
app.use('/api/shipment-legs', require('./routes/api/shipment-legs'));
app.use('/api/dashboard', require('./routes/api/dashboard'));
app.use('/api/shippers', require('./routes/api/shippers'));
app.use('/api/consignees', require('./routes/api/consignees'));
app.use('/api/notify-parties', require('./routes/api/notify-parties'));

// Add a test auth endpoint to verify token and see what user is being used
app.get('/api/test-auth', authMiddleware, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user,
    tokenInfo: {
      provided: !!req.header('x-auth-token'),
      isDefaultDevToken: req.header('x-auth-token') === 'default-dev-token'
    },
    authMode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  let dbStatusText;
  
  switch(dbStatus) {
    case 0:
      dbStatusText = 'disconnected';
      break;
    case 1:
      dbStatusText = 'connected';
      break;
    case 2:
      dbStatusText = 'connecting';
      break;
    case 3:
      dbStatusText = 'disconnecting';
      break;
    default:
      dbStatusText = 'unknown';
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: {
      status: dbStatusText,
      readyState: dbStatus,
      host: mongoose.connection.host || 'N/A'
    },
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    serverInfo: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }
  });
});

// Add a public diagnostics endpoint that works without authentication
app.get('/api/public-diagnostics', (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    let dbStatusText;
    
    switch(dbStatus) {
      case 0:
        dbStatusText = 'disconnected';
        break;
      case 1:
        dbStatusText = 'connected';
        break;
      case 2:
        dbStatusText = 'connecting';
        break;
      case 3:
        dbStatusText = 'disconnecting';
        break;
      default:
        dbStatusText = 'unknown';
    }
    
    res.json({
      status: 'api-responding',
      timestamp: new Date(),
      database: {
        status: dbStatusText,
        readyState: dbStatus,
        connectionError: mongoose.connection.readyState !== 1 ? 'DNS resolution failed for MongoDB Atlas cluster' : null,
        errorDetails: mongoose.connection.readyState !== 1 ? 'The MongoDB Atlas cluster could not be found. The cluster may have been deleted, paused, or renamed.' : null,
        connectionString: process.env.NODE_ENV === 'production' ? 'hidden' : mongoose.connection._connectionString.replace(/:([^@]+)@/, ':***@')
      },
      serverInfo: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      message: 'This endpoint works without authentication and provides server status even when the database is unavailable.'
    });
  } catch (err) {
    console.error('Diagnostics error:', err.message);
    res.status(500).json({ 
      msg: 'Error running diagnostics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      suggestion: 'MongoDB Atlas is unavailable. You need to update your connection string with a valid cluster.'
    });
  }
});

// Catch-all route handler for SPA - must come after API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // First check if this is an API request
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ msg: 'API endpoint not found' });
    }
    
    // Otherwise serve the index.html file
    const clientPath = path.resolve(__dirname, 'client', 'build', 'index.html');
    const frontendPath = path.resolve(__dirname, '..', 'frontend', 'build', 'index.html');
    
    if (fs.existsSync(clientPath)) {
      return res.sendFile(clientPath);
    } else if (fs.existsSync(frontendPath)) {
      return res.sendFile(frontendPath);
    } else {
      return res.status(404).send('Application not found on server');
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error(`[${new Date().toISOString()}] Server error:`, err.message);
  console.error(err.stack);
  
  // Create a structured error response
  const errorResponse = {
    message: 'Server Error',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV !== 'production' ? {
      stack: err.stack?.split('\n').slice(0, 3).join('\n'), // Only include first 3 lines of stack
      name: err.name,
      original: err.original || null
    } : undefined
  };
  
  // Include validation errors if any
  if (err.errors) {
    errorResponse.validationErrors = err.errors;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

// Connect to MongoDB Atlas and start server
async function startServer() {
  try {
    // Connect to MongoDB using the dedicated module
    await connectDB();
    console.log(`✅ Connected to MongoDB Atlas: ${mongoose.connection.host}`);

    // Start the HTTP server
    httpServer.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle server shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown() {
  try {
    console.log('Starting graceful shutdown...');
    
    // Close the HTTP server
    await new Promise((resolve) => {
      httpServer.close(resolve);
    });
    console.log('HTTP server closed');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Start the server
startServer();