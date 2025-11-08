const pool = require('../config/database');

class Connection {
  // Create a connection request
  static async createRequest(userId, targetUserId) {
    // Check if connection already exists in either direction
    const existing = await this.getConnectionStatus(userId, targetUserId);
    if (existing) {
      // If already exists, return it
      return existing;
    }
    
    // Insert new connection request
    const result = await pool.query(
      `INSERT INTO user_connections (user_id, connected_user_id, status, created_at) 
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [userId, targetUserId]
    );
    return result.rows[0];
  }

  // Accept a connection request
  static async acceptRequest(userId, targetUserId) {
    const result = await pool.query(
      `UPDATE user_connections 
       SET status = 'accepted', updated_at = NOW()
       WHERE user_id = $1 AND connected_user_id = $2 AND status = 'pending'
       RETURNING *`,
      [targetUserId, userId]
    );
    return result.rows[0];
  }

  // Get connection status between two users
  static async getConnectionStatus(userId, targetUserId) {
    const result = await pool.query(
      `SELECT * FROM user_connections 
       WHERE (user_id = $1 AND connected_user_id = $2) 
          OR (user_id = $2 AND connected_user_id = $1)
       LIMIT 1`,
      [userId, targetUserId]
    );
    return result.rows[0] || null;
  }

  // Get all connections for a user (accepted)
  static async getUserConnections(userId) {
    const result = await pool.query(
      `SELECT uc.*, 
              CASE 
                WHEN uc.user_id = $1 THEN uc.connected_user_id
                ELSE uc.user_id
              END as other_user_id
       FROM user_connections uc
       WHERE (uc.user_id = $1 OR uc.connected_user_id = $1) 
         AND uc.status = 'accepted'`,
      [userId]
    );
    return result.rows;
  }

  // Get connection count for a user
  static async getConnectionCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM user_connections 
       WHERE (user_id = $1 OR connected_user_id = $1) 
         AND status = 'accepted'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  // Remove/delete connection
  static async removeConnection(userId, targetUserId) {
    const result = await pool.query(
      `DELETE FROM user_connections 
       WHERE (user_id = $1 AND connected_user_id = $2) 
          OR (user_id = $2 AND connected_user_id = $1)
       RETURNING *`,
      [userId, targetUserId]
    );
    return result.rows[0];
  }

  // Get pending requests for a user
  static async getPendingRequests(userId) {
    const result = await pool.query(
      `SELECT uc.*, u.username, u.email
       FROM user_connections uc
       JOIN users u ON uc.user_id = u.id
       WHERE uc.connected_user_id = $1 AND uc.status = 'pending'`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Connection;

