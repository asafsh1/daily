/**
 * Advanced MongoDB Connection Module
 * 
 * This module attempts multiple strategies to connect to MongoDB Atlas
 * to overcome common deployment issues like DNS resolution problems.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
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

class MongoDBConnector {
  constructor() {
    // Initialize connection details
    this.connectionDetails = {
      host: null,
      database: null,
      lastReconnectAttempt: null,
      reconnectAttempts: 0,
      strategy: null,
      fallbacksUsed: [],
      lastError: null,
      connectionState: 'unknown'
    };
    // Try to get MongoDB URI from environment or config
    try {
      this.mongoURI = process.env.MONGODB_URI || 
                       (require('config').get('mongoURI')) || 
                       `mongodb+srv://${FALLBACK_USERNAME}:${FALLBACK_PASSWORD}@${FALLBACK_CLUSTER}/${FALLBACK_DB_NAME}?retryWrites=true&w=majority`;
    } catch (err) {
      console.log('Failed to load config, using fallback URI');
      this.mongoURI = `mongodb+srv://${FALLBACK_USERNAME}:${FALLBACK_PASSWORD}@${FALLBACK_CLUSTER}/${FALLBACK_DB_NAME}?retryWrites=true&w=majority`;
    }
    
    // Extract credentials and host for alternative connection methods
    try {
      const matches = this.mongoURI.match(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
      if (matches && matches.length >= 6) {
        this.username = matches[2];
        this.password = matches[3];
        this.host = matches[4];
        this.dbName = matches[5];
      } else {
        console.warn('Could not parse MongoDB URI, using fallback values');
        this.username = FALLBACK_USERNAME;
        this.password = FALLBACK_PASSWORD;
        this.host = FALLBACK_CLUSTER;
        this.dbName = FALLBACK_DB_NAME;
      }
    } catch (error) {
      console.warn('Error parsing MongoDB URI:', error.message);
      this.username = FALLBACK_USERNAME;
      this.password = FALLBACK_PASSWORD;
      this.host = FALLBACK_CLUSTER;
      this.dbName = FALLBACK_DB_NAME;
    }
    
    // Connection options
    this.defaultOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      family: 4,
      maxPoolSize: 50,
      minPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000
    };
  }
  
  // Main connection method that tries multiple strategies
  async connect() {
    this.connectionDetails.lastReconnectAttempt = new Date().toISOString();
    this.connectionDetails.reconnectAttempts++;
    
    console.log('='.repeat(50));
    console.log('MONGODB CONNECTION ATTEMPT');
    console.log('='.repeat(50));
    
    // Log connection parameters (redacted)
    const redactedURI = this.mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`MongoDB URI: ${redactedURI}`);
    console.log(`Host: ${this.host}`);
    console.log(`Database: ${this.dbName}`);
    
    // Try each connection strategy in sequence
    try {
      // Strategy 1: Standard mongoose.connect with SRV record
      console.log('\nStrategy 1: Standard connection with SRV record');
      try {
        await this.standardConnection();
        // After successful connection, record the connection details
        const dbUrl = mongoose.connection.client.s.url;
        try {
          const urlObj = new URL(dbUrl);
          this.connectionDetails.host = urlObj.host;
          this.connectionDetails.database = urlObj.pathname.replace('/', '');
        } catch (e) {
          console.error('Failed to parse DB URL:', e.message);
        }
        return mongoose.connection;
      } catch (error) {
        console.log(`Strategy 1 failed: ${error.message}`);
      }
      
      // Strategy 2: Resolve SRV records manually
      console.log('\nStrategy 2: Manual SRV record resolution');
      try {
        await this.manualSrvConnection();
        // After successful connection, record the connection details
        const dbUrl = mongoose.connection.client.s.url;
        try {
          const urlObj = new URL(dbUrl);
          this.connectionDetails.host = urlObj.host;
          this.connectionDetails.database = urlObj.pathname.replace('/', '');
        } catch (e) {
          console.error('Failed to parse DB URL:', e.message);
        }
        return mongoose.connection;
      } catch (error) {
        console.log(`Strategy 2 failed: ${error.message}`);
      }
      
      // Strategy 3: Try direct connection to known MongoDB Atlas IPs
      console.log('\nStrategy 3: Direct connection to known MongoDB Atlas IPs');
      try {
        await this.directIpConnection();
        // After successful connection, record the connection details
        const dbUrl = mongoose.connection.client.s.url;
        try {
          const urlObj = new URL(dbUrl);
          this.connectionDetails.host = urlObj.host;
          this.connectionDetails.database = urlObj.pathname.replace('/', '');
        } catch (e) {
          console.error('Failed to parse DB URL:', e.message);
        }
        return mongoose.connection;
      } catch (error) {
        console.log(`Strategy 3 failed: ${error.message}`);
      }
      
      // Strategy 4: Use MongoDB driver directly
      console.log('\nStrategy 4: Direct MongoDB driver connection');
      try {
        const client = await this.driverConnection();
        // We'll attach the client to mongoose for compatibility
        mongoose.connection.client = client;
        // After successful connection, record the connection details
        const dbUrl = mongoose.connection.client.s.url;
        try {
          const urlObj = new URL(dbUrl);
          this.connectionDetails.host = urlObj.host;
          this.connectionDetails.database = urlObj.pathname.replace('/', '');
        } catch (e) {
          console.error('Failed to parse DB URL:', e.message);
        }
        return mongoose.connection;
      } catch (error) {
        console.log(`Strategy 4 failed: ${error.message}`);
      }
      
      // All strategies failed
      throw new Error('All MongoDB connection strategies failed');
      
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
      console.error('Try updating your MongoDB Atlas whitelist to include 0.0.0.0/0');
      
      // In production, don't crash the server
      if (process.env.NODE_ENV === 'production') {
        console.warn('Running in production mode without database connection');
        return null;
      } else {
        throw error;
      }
    }
  }
  
  // Strategy 1: Standard connection using mongoose
  async standardConnection() {
    this.connectionDetails.strategy = 'standard';
    this.connectionDetails.fallbacksUsed.push('standard');
    console.log('Attempting standard mongoose.connect...');
    await this.testDnsResolution(this.host);
    return await mongoose.connect(this.mongoURI, this.defaultOptions);
  }
  
  // Strategy 2: Manual SRV record resolution
  async manualSrvConnection() {
    this.connectionDetails.strategy = 'manualSrv';
    this.connectionDetails.fallbacksUsed.push('manualSrv');
    if (!this.host.includes('.mongodb.net')) {
      throw new Error('Host is not a MongoDB Atlas domain');
    }
    
    console.log('Manually resolving SRV records...');
    const srvRecords = await this.resolveSrv(`_mongodb._tcp.${this.host}`);
    
    if (!srvRecords || srvRecords.length === 0) {
      throw new Error('No SRV records found');
    }
    
    console.log(`Found ${srvRecords.length} SRV records`);
    
    // Try to connect to each SRV target
    for (const record of srvRecords) {
      try {
        const uri = `mongodb://${this.username}:${this.password}@${record.name}:${record.port}/${this.dbName}?ssl=true&replicaSet=atlas-${this.host.split('.')[0]}&authSource=admin`;
        console.log(`Trying SRV target: ${record.name}:${record.port}`);
        return await mongoose.connect(uri, this.defaultOptions);
      } catch (error) {
        console.log(`Failed to connect to ${record.name}:${record.port}: ${error.message}`);
      }
    }
    
    throw new Error('All SRV targets failed');
  }
  
  // Strategy 3: Direct connection to known MongoDB Atlas IPs
  async directIpConnection() {
    this.connectionDetails.strategy = 'directIp';
    this.connectionDetails.fallbacksUsed.push('directIp');
    console.log('Attempting direct IP connections...');
    
    for (const ip of KNOWN_MONGODB_IPS) {
      try {
        console.log(`Trying IP: ${ip}`);
        const uri = `mongodb://${this.username}:${this.password}@${ip}:27017/${this.dbName}?ssl=true&authSource=admin`;
        return await mongoose.connect(uri, {
          ...this.defaultOptions,
          ssl: true,
          authSource: 'admin',
          directConnection: true
        });
      } catch (error) {
        console.log(`Failed to connect to ${ip}: ${error.message}`);
      }
    }
    
    throw new Error('All direct IP connections failed');
  }
  
  // Strategy 4: Using the MongoDB driver directly
  async driverConnection() {
    this.connectionDetails.strategy = 'driver';
    this.connectionDetails.fallbacksUsed.push('driver');
    console.log('Using MongoDB driver directly...');
    const client = new MongoClient(this.mongoURI, this.defaultOptions);
    await client.connect();
    console.log('MongoDB driver connection successful');
    
    // Validate connection by running a command
    const result = await client.db('admin').command({ ping: 1 });
    if (result && result.ok === 1) {
      console.log('Ping command successful');
    }
    
    return client;
  }
  
  // Helper method to test DNS resolution
  async testDnsResolution(hostname) {
    try {
      console.log(`Testing DNS resolution for ${hostname}...`);
      const addresses = await new Promise((resolve, reject) => {
        dns.resolve(hostname, (err, addresses) => {
          if (err) {
            console.error(`DNS resolution failed: ${err.message}`);
            reject(err);
          } else {
            console.log(`DNS resolution successful: ${addresses.join(', ')}`);
            resolve(addresses);
          }
        });
      });
      return addresses;
    } catch (error) {
      console.error(`DNS resolution error: ${error.message}`);
      // Try lookup as fallback
      try {
        console.log('Trying DNS lookup as fallback...');
        const address = await new Promise((resolve, reject) => {
          dns.lookup(hostname, { family: 4 }, (err, address) => {
            if (err) {
              console.error(`DNS lookup failed: ${err.message}`);
              reject(err);
            } else {
              console.log(`DNS lookup successful: ${address}`);
              resolve(address);
            }
          });
        });
        return [address];
      } catch (lookupError) {
        console.error(`DNS lookup also failed: ${lookupError.message}`);
        throw error;
      }
    }
  }
  
  // Helper method to resolve SRV records
  async resolveSrv(hostname) {
    try {
      console.log(`Resolving SRV records for ${hostname}...`);
      return await new Promise((resolve, reject) => {
        dns.resolveSrv(hostname, (err, addresses) => {
          if (err) {
            console.error(`SRV resolution failed: ${err.message}`);
            reject(err);
          } else {
            console.log(`SRV resolution successful: ${addresses.length} records`);
            resolve(addresses);
          }
        });
      });
    } catch (error) {
      console.error(`SRV resolution error: ${error.message}`);
      throw error;
    }
  }
  
  // Method to attempt to reconnect if the database is down
  async retryConnection() {
    // Only retry if we're not already connected
    if (mongoose.connection.readyState === 1) {
      console.log('Database already connected, no need to retry');
      return mongoose.connection;
    }
    
    console.log('Attempting to reconnect to MongoDB...');
    this.connectionDetails.lastReconnectAttempt = new Date().toISOString();
    this.connectionDetails.reconnectAttempts++;
    
    try {
      return await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error.message);
      this.connectionDetails.lastError = error.message;
      return null;
    }
  }
  
  // Get current connection state
  getConnectionState() {
    const readyState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    
    this.connectionDetails.connectionState = states[readyState] || `unknown (${readyState})`;
    return {
      readyState,
      state: this.connectionDetails.connectionState,
      details: this.connectionDetails
    };
  }
}

// Create a singleton instance
const connector = new MongoDBConnector();

// Middleware to check DB connection state for routes
const checkConnectionState = (req, res, next) => {
  // If database is connected, proceed
  if (mongoose.connection.readyState === 1) {
    req.dbConnected = true;
    return next();
  }
  
  // Database not connected - try to reconnect
  const connectionState = connector.getConnectionState();
  console.log(`Database not connected (state: ${connectionState.state}). Attempting reconnection...`);
  
  // Set a flag to indicate database is not available - routes can use this to serve fallback data
  req.dbConnected = false;
  req.dbConnectionState = connectionState;
  
  // Only attempt reconnection if we're not already trying to connect
  if (mongoose.connection.readyState !== 2) {
    connector.retryConnection()
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
  return await connector.connect();
}

// Export the module
module.exports = {
  connect,
  getConnectionDetails: () => connector.connectionDetails,
  getConnectionState: () => connector.getConnectionState(),
  checkConnectionState, // Middleware for routes to check connection state
  MongoDBConnector // Export the MongoDBConnector class
}; 