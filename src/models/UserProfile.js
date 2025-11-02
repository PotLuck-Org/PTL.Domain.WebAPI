const pool = require('../config/database');

class UserProfile {
  // Find profile by user ID
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  // Create profile
  static async create({ userId, firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender }) {
    const result = await pool.query(
      `INSERT INTO user_profiles 
       (user_id, firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender]
    );
    return result.rows[0];
  }

  // Check if profile exists
  static async exists(userId) {
    const result = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0;
  }

  // Update profile
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
      `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

module.exports = UserProfile;
