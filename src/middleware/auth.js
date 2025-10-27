const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, username, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userResult.rows[0];

    // Check if user is active (unless they are Admin)
    if (!user.is_active && user.role !== 'Admin') {
      return res.status(403).json({ error: 'Account is not activated. Please contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Check if user has permission for specific resource
const hasPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user.role;

      // Get role permissions from database
      const permissionsResult = await pool.query(
        'SELECT permissions FROM role_permissions WHERE role = $1',
        [userRole]
      );

      if (permissionsResult.rows.length === 0) {
        return res.status(403).json({ error: 'No permissions found for this role' });
      }

      const rolePermissions = permissionsResult.rows[0].permissions;

      // Check if user has any of the required permissions
      const hasAccess = requiredPermissions.some(permission => rolePermissions.includes(permission));

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredPermissions,
          your_role: userRole
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check if user owns resource or has admin/president role
const ownsResourceOrAdmin = (getUserIdFn) => {
  return (req, res, next) => {
    const userId = getUserIdFn(req);
    const userRole = req.user.role;

    // Admin and President have full access
    if (userRole === 'Admin' || userRole === 'President') {
      return next();
    }

    // Check if user owns the resource
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only access your own resources.' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  hasPermission,
  ownsResourceOrAdmin
};
