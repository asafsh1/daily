/**
 * Root index.js file for Render deployment
 * 
 * This file is the main entry point for the Render deployment
 * and simply requires our server.js file
 */

console.log('Starting application from root index.js');
console.log('Current directory:', __dirname);
console.log('Node version:', process.version);

// Load server.js directly
require('./server.js'); 