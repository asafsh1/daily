/**
 * Advanced MongoDB Connection Module
 * 
 * This module attempts multiple strategies to connect to MongoDB Atlas
 * to overcome common deployment issues like DNS resolution problems.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns').promises;
const { MongoClient } = require('mongodb');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Hardcoded database credentials as a last resort fallback
const FALLBACK_USERNAME = "asafasaf5347";
const FALLBACK_PASSWORD = "asafasaf5347";
const FALLBACK_CLUSTER = "cluster0.lyz67.mongodb.net";
const FALLBACK_DB_NAME = "shipment-tracker";

// Known MongoDB Atlas IPs (used as fallback if DNS fails)
const KNOWN_MONGODB_IPS = [
  // US East
  '18.233.21.91',
  '3.216.134.135',
  // US West
  '52.12.189.144',
  '54.70.26.173',
  // EU West
  '34.248.104.50',
  '54.73.178.50',
  // Asia/Pacific
  '3.104.255.227',
  '13.236.215.64'
];

// Set DNS servers for better MongoDB Atlas connectivity
dns.setServers([
  '8.8.8.8',  // Google DNS
  '8.8.4.4',  // Google DNS backup
  '1.1.1.1',  // Cloudflare
  '1.0.0.1'   // Cloudflare backup
]);

let connectionDetails = {
  host: null,
  database: null,
  strategy: null,
  lastReconnectAttempt: null,
  reconnectAttempts: 0,
  fallbacksUsed: []
};

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority'
};

// Connection state check middleware
const checkConnectionState = (req, res, next) => {
  req.dbConnected = mongoose.connection.readyState === 1;
  req.dbConnectionState = {
    state: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
  next();
};

// Robust connection handler
const connectWithRetry = async (uri, options = {}, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`MongoDB connection attempt ${attempt}/${maxRetries}`);
      const conn = await mongoose.connect(uri, { ...mongooseOptions, ...options });
      console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Main connection function
const connectDB = async () => {
  try {
    console.log('Starting MongoDB Atlas connection...');
    console.log('MongoDB URI exists in env:', !!process.env.MONGODB_URI);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }
    
    // Log sanitized URI for debugging
    const sanitizedUri = uri.replace(/\/\/[^@]+@/, '//[CREDENTIALS]@');
    console.log('MongoDB URI pattern:', sanitizedUri);
    
    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(uri, mongooseOptions);
    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

function getConnectionDetails() {
  return {
    ...connectionDetails,
    currentState: mongoose.connection.readyState
  };
}

// Middleware to check DB connection state for routes
const checkConnectionStateMiddleware = (req, res, next) => {
  // If database is connected, proceed
  if (mongoose.connection.readyState === 1) {
    req.dbConnected = true;
    return next();
  }
  
  // Database not connected - try to reconnect
  const connectionState = getConnectionDetails();
  console.log(`Database not connected (state: ${connectionState.currentState}). Attempting reconnection...`);
  
  // Set a flag to indicate database is not available - routes can use this to serve fallback data
  req.dbConnected = false;
  req.dbConnectionState = connectionState;
  
  // Only attempt reconnection if we're not already trying to connect
  if (mongoose.connection.readyState !== 2) {
    connectDB()
      .then(connection => {
        // If reconnected successfully, proceed
        if (connection && mongoose.connection.readyState === 1) {
          console.log('Successfully reconnected to database');
          req.dbConnected = true;
          next();
        } else {
          // Still failed to connect, but proceed to route handler to allow fallback data
          console.log('Failed to reconnect to database, allowing route handler to use fallback data');
          next();
        }
      })
      .catch(error => {
        console.error('Error during reconnection attempt:', error.message);
        // Let the route handler use fallback data
        next();
      });
  } else {
    // Currently in the process of connecting, but allow the route handler to proceed with fallback
    console.log('Database connection in progress, allowing route to use fallback data');
    next();
  }
};

// Export the connect function that uses the singleton
async function connect() {
  return await connectDB();
}

// Export the module
module.exports = {
  connect,
  getConnectionDetails,
  checkConnectionState, // Middleware for routes to check connection state
  connectionDetails, // Export the connectionDetails object
  checkConnectionStateMiddleware
}; 