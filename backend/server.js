require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { connect: connectDB } = require('./mongodb-connect');

// Initialize Express
const app = express();

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
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.netlify.app') || process.env.NODE_ENV !== 'production') {
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

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors(corsOptions));

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
  app.use(express.static('frontend/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();