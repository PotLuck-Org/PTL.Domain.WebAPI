const pool = require('../config/database');

class UserAddress {
  // Find address by user ID
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  // Create address
  static async create({ userId, street_number, street_address, post_code, county }) {
    const result = await pool.query(
      `INSERT INTO user_addresses 
       (user_id, street_number, street_address, post_code, county) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, street_number, street_address, post_code, county]
    );
    return result.rows[0];
  }

  // Update address
  static async update(userId, fields) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return null;
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE user_addresses SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

module.exports = UserAddress;
