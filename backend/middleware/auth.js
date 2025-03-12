const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  // Skip authentication and allow all requests
  req.user = { id: 'bypass-auth', role: 'admin' };
  next();
}; 