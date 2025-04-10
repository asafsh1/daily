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

// Set DNS servers to Google's public DNS for better resolution
dns.setServers([
  '8.8.8.8',
  '8.8.4.4',
  '1.1.1.1'
]);

let connectionDetails = {
  host: null,
  database: null,
  strategy: null,
  lastReconnectAttempt: null,
  reconnectAttempts: 0,
  fallbacksUsed: []
};

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MongoDB URI not found in environment variables');
    return null;
  }

  try {
    // Configure mongoose
    mongoose.set('strictQuery', true);
    
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      ssl: true,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 30000
    };

    // Extract connection details for monitoring
    const matches = uri.match(/mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@([^/]+)\/([^?]+)/);
    if (matches) {
      connectionDetails.host = matches[1];
      connectionDetails.database = matches[2];
    }

    // Strategy 1: Standard connection
    try {
      console.log('Strategy 1: Standard connection with SRV record');
      connectionDetails.strategy = 'standard';
      await mongoose.connect(uri, mongooseOptions);
      console.log('✅ Connected to MongoDB Atlas using standard connection');
      return mongoose.connection;
    } catch (err) {
      console.error('Strategy 1 failed:', err.message);
      connectionDetails.fallbacksUsed.push('standard');
    }

    // Strategy 2: Try direct connection without SRV
    try {
      console.log('Strategy 2: Direct connection without SRV');
      const directUri = uri.replace('+srv', '');
      connectionDetails.strategy = 'direct';
      await mongoose.connect(directUri, { ...mongooseOptions, directConnection: true });
      console.log('✅ Connected to MongoDB Atlas using direct connection');
      return mongoose.connection;
    } catch (err) {
      console.error('Strategy 2 failed:', err.message);
      connectionDetails.fallbacksUsed.push('direct');
    }

    // If all strategies fail, throw error
    throw new Error('All MongoDB connection strategies failed');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    connectionDetails.lastReconnectAttempt = new Date();
    connectionDetails.reconnectAttempts++;
    return null;
  }
}

function getConnectionDetails() {
  return {
    ...connectionDetails,
    currentState: mongoose.connection.readyState
  };
}

// Middleware to check DB connection state for routes
const checkConnectionState = (req, res, next) => {
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
  connectionDetails // Export the connectionDetails object
}; 