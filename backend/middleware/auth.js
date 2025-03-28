const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  // Skip authentication and set default admin user
  req.user = {
    id: 'default-user',
    role: 'admin'
  };
  next();
}; 