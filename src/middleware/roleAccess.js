// Dynamic Role-Based Access Control
const checkRoleAccess = (requiredRoles = []) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      // If no specific roles required, allow all authenticated users
      if (requiredRoles.length === 0) {
        return next();
      }

      // Check if user's role is in the required roles
      if (requiredRoles.includes(userRole)) {
        return next();
      }

      return res.status(403).json({ 
        error: 'Access denied',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
        your_role: userRole
      });
    } catch (error) {
      console.error('Role access check error:', error);
      res.status(500).json({ error: 'Role access check failed' });
    }
  };
};

module.exports = checkRoleAccess;
