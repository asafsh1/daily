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

// Connect to Database (but don't exit if it fails)
(async () => {
  const connected = await connectDB();
  if (!connected) {
    console.warn('⚠️ WARNING: Running with limited functionality due to database connection failure');
    console.warn('⚠️ APIs will return empty data instead of failing');
  } else {
    console.log('✅ Database connection successful - all functionality available');
  }
})();

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

// Function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
};

// Find an available port starting from the specified PORT
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`Port ${port} is not available, trying next port...`);
    port++;
    if (port > startPort + 10) {
      throw new Error('Unable to find an available port after 10 attempts');
    }
  }
  return port;
};

// Start the server
const startServer = async () => {
  try {
    // Try to find an available port
    const availablePort = await findAvailablePort(PORT);
    
    // Connect to MongoDB
    const dbConnected = await connectDB();
    
    // Start the HTTP server
    await new Promise((resolve) => {
      httpServer.listen(availablePort, () => {
        console.log(`Server started on port ${availablePort}`);
        resolve();
      });
    });
    
    // Log database connection status
    if (!dbConnected) {
      console.warn('\n⚠️ WARNING: Server started with limited functionality due to database connection issues.\n');
    }
    
    // Set up the Socket.IO server
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      }
    });
    
    // Socket.IO connection handlers
    io.on('connection', (socket) => {
      console.log('New client connected');
      
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
      
      // Add your socket event handlers here
    });
    
    // Setup graceful shutdown
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\nReceived shutdown signal. Closing server gracefully...');
  
  httpServer.close(() => {
    console.log('HTTP server closed');
    
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    
    console.log('Server shutdown complete');
    process.exit(0);
  });
  
  // Force exit after 10 seconds if not closed properly
  setTimeout(() => {
    console.log('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start the server
startServer();