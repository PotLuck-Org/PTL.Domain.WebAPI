const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Find user by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, username, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, email, password, username, role, is_active, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  // Create new user
  static async create({ email, password, username, role = 'Member' }) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        `INSERT INTO users (email, password, username, role, is_active) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, username, role, is_active, created_at`,
        [email, hashedPassword, username, role, false]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('User.create error:', error);
      throw error;
    }
  }

  // Check if email exists
  static async emailExists(email) {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  // Check if username exists
  static async usernameExists(username) {
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update user role
  static async updateRole(userId, newRole) {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, username, role, is_active',
      [newRole, userId]
    );
    return result.rows[0];
  }

  // Activate/deactivate user (Admin only)
  static async updateActiveStatus(userId, isActive) {
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, username, role, is_active',
      [isActive, userId]
    );
    return result.rows[0];
  }

  // Check if user is active
  static async isActive(userId) {
    const result = await pool.query(
      'SELECT is_active FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.is_active || false;
  }

  // Get all users
  static async findAll() {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }
}

module.exports = User;
