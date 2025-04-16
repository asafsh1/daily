require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { connect: connectDB } = require('./mongodb-connect');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'https://veleka-shipments-daily-report.netlify.app',
          'https://daily-shipments.netlify.app',
          'https://daily-tracking.netlify.app',
          'https://daily-admin.netlify.app',
          'http://localhost:3000'
        ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'https://veleka-shipments-daily-report.netlify.app',
      'https://daily-shipments.netlify.app',
      'https://daily-tracking.netlify.app',
      'https://daily-admin.netlify.app',
      'http://localhost:3000'
    ];

console.log('Allowed Origins:', allowedOrigins);

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow all origins in development mode
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin) || origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'Accept'],
  credentials: true,
  maxAge: 86400
};

// Handle preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors(corsOptions));

// Public endpoints that don't require authentication
app.get('/api/public-diagnostics', async (req, res) => {
  try {
    const diagnostics = {
      server: {
        status: 'online',
        timestamp: new Date(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      database: {
        readyState: mongoose.connection.readyState,
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    };

    // Generate a demo token (only for non-production)
    if (process.env.NODE_ENV !== 'production') {
      const jwt = require('jsonwebtoken');
      const payload = {
        user: {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'viewer'
        }
      };
      
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'developmentsecret',
        { expiresIn: '1 day' }
      );
      
      diagnostics.auth = {
        devToken: token,
        note: 'This token is for development purposes only.'
      };
    }
    
    res.json(diagnostics);
  } catch (err) {
    console.error('Error fetching public diagnostics:', err.message);
    res.status(500).json({
      error: err.message,
      server: {
        status: 'error',
        timestamp: new Date()
      }
    });
  }
});

// Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/shipments', require('./routes/api/shipments'));
app.use('/api/shipment-legs', require('./routes/api/shipmentLegs'));
app.use('/api/customers', require('./routes/api/customers'));
app.use('/api/dashboard', require('./routes/api/dashboard'));
app.use('/api/airlines', require('./routes/api/airlines'));
app.use('/api/shippers', require('./routes/api/shippers'));
app.use('/api/consignees', require('./routes/api/consignees'));
app.use('/api/notify-parties', require('./routes/api/notify-parties'));

// Handle 404s for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ msg: 'API endpoint not found' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Check if frontend/build exists
  const frontendBuildPath = path.resolve(__dirname, '..', 'frontend', 'build');
  if (require('fs').existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
    });
  } else {
    console.log('Frontend build folder not found, API-only mode');
    // Add a health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });
    // Add a default route
    app.get('/', (req, res) => {
      res.status(200).json({ 
        msg: 'Daily Shipment Tracker API',
        version: '1.0.0',
        endpoints: ['/api/shipments', '/api/dashboard', '/api/auth', '/api/users']
      });
    });
  }
} else {
  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  // Add a default route
  app.get('/', (req, res) => {
    res.status(200).json({ 
      msg: 'Daily Shipment Tracker API (Development)',
      version: '1.0.0',
      endpoints: ['/api/shipments', '/api/dashboard', '/api/auth', '/api/users']
    });
  });
}

const PORT = process.env.PORT || 5001;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();