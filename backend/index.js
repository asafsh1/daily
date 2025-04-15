// Main entry point for Render deployment
console.log('Starting application from root index.js');
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

  // Try to load and run server from the correct location
  try {
    console.log('Attempting to load server from src/server.js');
    require('./src/server');
  } catch (srcServerErr) {
    console.error('Error loading src/server.js:', srcServerErr.message);
    
    try {
      console.log('Attempting to load server from src/index.js');
      require('./src/index');
    } catch (srcIndexErr) {
      console.error('Error loading src/index.js:', srcIndexErr.message);
      
      try {
        console.log('Attempting to load server from server.js');
        require('./server');
      } catch (serverErr) {
        console.error('Error loading server.js:', serverErr.message);
        console.error('All server loading attempts failed. Please check file paths and configurations.');
        process.exit(1);
      }
    }
  }
} catch (err) {
  console.error('Fatal error starting application:', err);
  process.exit(1);
}
