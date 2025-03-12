const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

// Default admin user
const DEFAULT_ADMIN = {
  id: 'admin-id-123456',
  name: 'Admin User',
  email: 'admin@shipment.com',
  role: 'admin',
  password: '$2a$10$yjCgV.GgaRwKaVcY9uc7B.Ai23JKz9Sm4UGaeMv3xSqcZIBDkzVlm' // bcrypt hash for 'admin123'
};

// Default manager user
const DEFAULT_MANAGER = {
  id: 'manager-id-123456',
  name: 'Manager User',
  email: 'manager@shipment.com',
  role: 'manager',
  password: '$2a$10$yjCgV.GgaRwKaVcY9uc7B.Ai23JKz9Sm4UGaeMv3xSqcZIBDkzVlm' // bcrypt hash for 'admin123'
};

// Default team member user
const DEFAULT_TEAM_MEMBER = {
  id: 'team-member-id-123456',
  name: 'Team Member',
  email: 'team@shipment.com',
  role: 'team_member',
  password: '$2a$10$yjCgV.GgaRwKaVcY9uc7B.Ai23JKz9Sm4UGaeMv3xSqcZIBDkzVlm' // bcrypt hash for 'admin123'
};

// All default users
const DEFAULT_USERS = [DEFAULT_ADMIN, DEFAULT_MANAGER, DEFAULT_TEAM_MEMBER];

// Authenticate user
const authenticateUser = async (email, password) => {
  // Find user by email
  const user = DEFAULT_USERS.find(user => user.email === email);
  
  if (!user) {
    return null;
  }
  
  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    return null;
  }
  
  // Create JWT payload
  const payload = {
    user: {
      id: user.id,
      role: user.role
    }
  };
  
  // Sign token
  const token = jwt.sign(
    payload,
    config.get('jwtSecret'),
    { expiresIn: '5 days' }
  );
  
  return { token };
};

// Get user by ID
const getUserById = (userId) => {
  const user = DEFAULT_USERS.find(user => user.id === userId);
  
  if (!user) {
    return null;
  }
  
  // Return user without password
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Get all users
const getAllUsers = () => {
  return DEFAULT_USERS.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
};

module.exports = {
  authenticateUser,
  getUserById,
  getAllUsers,
  DEFAULT_ADMIN,
  DEFAULT_MANAGER,
  DEFAULT_TEAM_MEMBER
}; 