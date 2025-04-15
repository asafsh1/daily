/**
 * Root server.js file for Render deployment
 * 
 * This file is the main entry point for the Render deployment
 * It simply requires the actual server.js file from the src directory
 */

console.log('Starting server from root server.js');
console.log('Current directory:', __dirname);
console.log('Node version:', process.version);

try {
  // Set up custom DNS resolution for MongoDB Atlas connectivity if needed
  try {
    require('./dns-resolution-debug');
    console.log('Loaded DNS resolution debugging');
  } catch (dnsErr) {
    console.warn('DNS resolution debugging not loaded:', dnsErr.message);
  }

  // Load the actual server from src/server.js
  console.log('Loading server from src/server.js');
  require('./src/server');
} catch (err) {
  console.error('Error starting server:', err);
  process.exit(1);
} 