const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
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
// app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/shipments', require('./routes/api/shipments'));
app.use('/api/customers', require('./routes/api/customers'));
app.use('/api/airlines', require('./routes/api/airlines'));
app.use('/api/shipment-legs', require('./routes/api/shipment-legs'));
app.use('/api/shippers', require('./routes/api/shippers'));
app.use('/api/consignees', require('./routes/api/consignees'));
app.use('/api/notify-parties', require('./routes/api/notify-parties'));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
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

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// Set up websocket communication
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});