const pool = require('../config/database');

class RolePermission {
  // Find permissions by role
  static async findByRole(role) {
    const result = await pool.query(
      'SELECT permissions FROM role_permissions WHERE role = $1',
      [role]
    );
    return result.rows[0]?.permissions || [];
  }

  // Find all roles
  static async findAll() {
    const result = await pool.query(
      'SELECT role, permissions FROM role_permissions ORDER BY role'
    );
    return result.rows;
  }

  // Update permissions
  static async update(role, permissions) {
    const result = await pool.query(
      `UPDATE role_permissions 
       SET permissions = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE role = $2 
       RETURNING *`,
      [permissions, role]
    );
    return result.rows[0];
  }
}

module.exports = RolePermission;
