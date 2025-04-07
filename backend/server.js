require('dotenv').config();

// Force using MongoDB Atlas connection string
process.env.MONGODB_URI = "mongodb+srv://asafasaf5347:asafasaf5347@cluster0.lyz67.mongodb.net/shipment-tracker?retryWrites=true&w=majority&appName=Cluster0";

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const auth = require('./middleware/auth');
const User = require('./models/User');
const Shipment = require('./models/Shipment');
const Customer = require('./models/Customer');
const { createServer } = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');

// Read port from environment variable first, then config, then default
const PORT = process.env.PORT || 5001;

// Initialize Express
const app = express();
const httpServer = createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: ['https://vocal-cheesecake-1379ed.netlify.app', 'https://daily-shipment-tracker.netlify.app', 'https://veleka-shipments-daily-report.netlify.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors({
  origin: ['https://vocal-cheesecake-1379ed.netlify.app', 'https://daily-shipment-tracker.netlify.app', 'https://veleka-shipments-daily-report.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Debug logging for all API requests
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} started`);
  
  // Once the request is processed, log the completion and response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} completed with status ${res.statusCode} in ${duration}ms`);
  });
  
  next();
});

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

// Change endpoint path to match frontend expectation
app.get('/api/dashboard/diagnostics', auth, async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user.role || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to access diagnostics' });
    }
    
    const dbStatus = require('mongoose').connection.readyState;
    const diagnosticInfo = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      database: {
        status: dbStatus === 1 ? 'connected' : 'disconnected',
        readyState: dbStatus,
        host: dbStatus === 1 ? mongoose.connection.host : 'N/A'
      },
      config: {
        port: PORT,
        corsOrigins: Array.isArray(app.get('corsOrigins')) ? app.get('corsOrigins') : ['default'],
        staticPath: app.get('staticPath') || 'none'
      }
    };
    
    // Try to get some DB stats if connected
    if (dbStatus === 1) {
      try {
        const userCount = await User.countDocuments();
        const shipmentCount = await Shipment.countDocuments();
        const customerCount = await Customer.countDocuments();
        
        diagnosticInfo.database.collections = {
          users: userCount,
          shipments: shipmentCount,
          customers: customerCount
        };
      } catch (err) {
        diagnosticInfo.database.collectionError = err.message;
      }
    }
    
    res.json(diagnosticInfo);
  } catch (err) {
    console.error('Diagnostics error:', err.message);
    res.status(500).json({ 
      msg: 'Error running diagnostics',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
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
        connectionError: 'DNS resolution failed for MongoDB Atlas cluster',
        errorDetails: 'The MongoDB Atlas cluster (cluster0.aqbmxvz.mongodb.net) could not be found. The cluster may have been deleted, paused, or renamed.',
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

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder - look in current directory or one level up
  const clientPath = path.resolve(__dirname, 'client', 'build');
  const frontendPath = path.resolve(__dirname, '..', 'frontend', 'build');
  
  // Try to find the build folder in either location
  let staticPath;
  if (fs.existsSync(clientPath)) {
    staticPath = clientPath;
  } else if (fs.existsSync(frontendPath)) {
    staticPath = frontendPath;
  }
  
  if (staticPath) {
    console.log(`Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  } else {
    console.warn('No static build folder found. API-only mode.');
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  console.error(err.stack);
  res.status(500).json({
    message: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
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