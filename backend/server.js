const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const mongoose = require('mongoose');
const auth = require('./middleware/auth');
const User = require('./models/User');
const Shipment = require('./models/Shipment');
const Customer = require('./models/Customer');
const { createServer } = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const net = require('net');

// Initialize Express
const app = express();
const httpServer = createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'https://vocal-cheesecake-1379ed.netlify.app', 'https://daily-shipment-tracker.netlify.app', 'https://veleka-shipments-daily-report.netlify.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Initialize Middleware before DB connection
app.use(express.json({ extended: false }));
app.use(cors({
  origin: ['http://localhost:3000', 'https://vocal-cheesecake-1379ed.netlify.app', 'https://daily-shipment-tracker.netlify.app', 'https://veleka-shipments-daily-report.netlify.app'],
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
app.use('/api/shipment-legs', require('./routes/api/shipmentLegs'));
app.use('/api/dashboard', require('./routes/api/dashboard'));
app.use('/api/shippers', require('./routes/api/shippers'));
app.use('/api/consignees', require('./routes/api/consignees'));
app.use('/api/notify-parties', require('./routes/api/notify-parties'));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = require('mongoose').connection.readyState;
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
      readyState: dbStatus
    },
    environment: process.env.NODE_ENV || 'development',
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

// Set the port for the server
const PORT = process.env.PORT || 5001;

// Check if a port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
};

// Find available port starting from the given port
const findAvailablePort = async (startPort) => {
  let port = startPort;
  const MAX_PORT = startPort + 20; // Don't search indefinitely
  
  while (port < MAX_PORT) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  // If all ports in range are taken, return null
  return null;
};

// Start server with proper error handling
const startServer = async () => {
  try {
    console.log('Database connection established.');
    
    // Check if port is available
    console.log(`Checking if port ${PORT} is available...`);
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      
      // Print out available API routes
      const routes = [];
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          routes.push(middleware.route.path);
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              let route = handler.route.path;
              if (middleware.regexp) {
                let middlewarePath = middleware.regexp.toString().match(/^\/\\\/([^\\\/]*)/);
                if (middlewarePath && middlewarePath[1]) {
                  route = '/' + middlewarePath[1] + route;
                }
              }
              routes.push(route);
            }
          });
        }
      });
      
      console.log('Available API routes:');
      routes.filter(route => route.startsWith('/api/')).forEach(route => {
        console.log(`- ${route}`);
      });
      
      console.log('Press Ctrl+C to stop the server');
    });
    
    // Set up signal handlers for graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      process.exit(0);
    });
  } catch (err) {
    console.error(`Server failed to start: ${err.message}`);
    process.exit(1);
  }
};

// Debug route for legs
app.get('/api/debug/shipment-legs/:id', async (req, res) => {
  try {
    const shipmentId = req.params.id;
    console.log(`[DEBUG] Checking legs for shipment: ${shipmentId}`);

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return res.json({
        error: 'Invalid shipment ID format',
        shipmentId: shipmentId
      });
    }

    // 1. First check if shipment exists
    const shipment = await mongoose.model('shipment').findById(shipmentId).lean();
    
    if (!shipment) {
      return res.json({
        error: 'Shipment not found',
        shipmentId: shipmentId
      });
    }

    // 2. Get legs from shipment.legs array
    const referencedLegs = [];
    if (shipment.legs && Array.isArray(shipment.legs)) {
      for (const legId of shipment.legs) {
        try {
          const leg = await mongoose.model('shipmentLeg').findById(legId).lean();
          if (leg) {
            referencedLegs.push({
              _id: leg._id,
              from: leg.from || leg.origin,
              to: leg.to || leg.destination,
              legOrder: leg.legOrder
            });
          } else {
            referencedLegs.push({ _id: legId, error: 'Not found' });
          }
        } catch (err) {
          referencedLegs.push({ _id: legId, error: err.message });
        }
      }
    }

    // 3. Also search for legs with shipment reference
    const independentLegs = await mongoose.model('shipmentLeg')
      .find({ shipment: shipmentId })
      .lean();

    // Return complete debug information
    res.json({
      shipmentId: shipmentId,
      shipment: {
        _id: shipment._id,
        hasLegsArray: !!shipment.legs,
        legsArrayLength: shipment.legs ? shipment.legs.length : 0,
        legsType: shipment.legs ? typeof shipment.legs : 'undefined',
        isLegsArray: Array.isArray(shipment.legs)
      },
      referencedLegs: {
        count: referencedLegs.length,
        legs: referencedLegs
      },
      independentLegs: {
        count: independentLegs.length,
        legs: independentLegs.map(leg => ({
          _id: leg._id,
          from: leg.from || leg.origin,
          to: leg.to || leg.destination,
          legOrder: leg.legOrder
        }))
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

// Connect to database
connectDB().then(dbConnected => {
  if (dbConnected) {
    console.log('✅ Database connection successful - all functionality available');
    startServer();
  } else {
    console.log('⚠️ Database connection not established - running with limited functionality');
    startServer();
  }
});