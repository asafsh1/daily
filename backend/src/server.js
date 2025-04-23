require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { connect: connectDB } = require('./mongodb-connect');
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config');  // Add config import

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

// Configure CORS - Using a more permissive approach for troubleshooting
const corsOptions = {
  origin: function (origin, callback) {
    // In all environments, allow requests without origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow all .netlify.app domains
    if (origin.endsWith('.netlify.app')) {
      callback(null, true);
      return;
    }
    
    // Check specific allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // If none of the above apply and in production, block the request
    console.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'Accept'],
  credentials: true,
  maxAge: 86400
};

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors(corsOptions));

// Add a pre-flight route handler for OPTIONS requests
app.options('*', cors(corsOptions));

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
        process.env.JWT_SECRET || config.jwtSecret || 'developmentsecret',
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
app.use('/api/profile', require('./routes/api/profile'));
// app.use('/api/posts', require('./routes/api/posts'));
app.use('/api/customers', require('./routes/api/customers'));
app.use('/api/shipments', require('./routes/api/shipments'));
app.use('/api/shipmentLegs', require('./routes/api/shipmentLegs'));
app.use('/api/shipment-legs', require('./routes/api/shipmentLegs'));
// app.use('/api/events', require('./routes/api/events')); // Commented out missing events route
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
  const frontendBuildPath = path.resolve(__dirname, '..', '..', 'frontend', 'build');
  if (require('fs').existsSync(frontendBuildPath)) {
    console.log('Frontend build folder found at:', frontendBuildPath);
    
    // Serve static files from the frontend build directory
    app.use(express.static(frontendBuildPath));
    
    // Always return the index.html for any non-API route
    app.get('*', (req, res) => {
      // Skip API routes - they're handled above
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ msg: 'API endpoint not found' });
      }
      
      console.log('Serving React app for client route:', req.url);
      res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
    });
  } else {
    // For render.com deployment where frontend is built separately
    console.log('Frontend build folder not found, API-only mode');
    
    // For render.com deployment, we need to serve the React app for all non-API routes
    // Even though we don't have the files locally, we can redirect to the frontend URL
    const frontendURL = process.env.FRONTEND_URL || 'https://veleka-shipments-daily-report.netlify.app';
    console.log('Frontend URL:', frontendURL);
    
    // Add a catch-all route for client-side routing
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Check if we're already at the frontend URL to prevent redirect loops
      const host = req.get('host');
      const currentURL = `${req.protocol}://${host}`;
      
      console.log(`Request host: ${host}, current URL: ${currentURL}, frontend URL: ${frontendURL}`);
      
      // Check if we're on the same host as the frontend URL or if we're on the render.com platform
      if (currentURL === frontendURL || host.includes('onrender.com')) {
        console.log('Detected potential redirect loop, serving static page instead');
        // We're already at the frontend URL, so serve a basic HTML page instead of redirecting
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Daily Shipment Tracker</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #333; }
                .message { background: #f8f9fa; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>Daily Shipment Tracker API Server</h1>
              <div class="message">
                <p>This is the backend API server for the Daily Shipment Tracker application.</p>
                <p>The frontend application should be accessed at: <a href="${frontendURL}">${frontendURL}</a></p>
              </div>
            </body>
          </html>
        `);
      }
      
      // For all other routes, redirect to the frontend
      console.log(`Redirecting to frontend for route: ${req.path}`);
      res.redirect(frontendURL);
    });
    
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
  
  // In development, all non-API routes should return a message
  // since the frontend is served separately
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    res.status(200).json({ 
      msg: 'Daily Shipment Tracker API (Development)',
      version: '1.0.0',
      frontend: 'Please use npm run frontend to start the React app',
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