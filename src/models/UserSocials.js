const pool = require('../config/database');

class UserSocials {
  // Find socials by user ID
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM user_socials WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  // Create socials
  static async create({ userId, facebook_url, github_url, linkedin_url, twitter_url }) {
    const result = await pool.query(
      `INSERT INTO user_socials 
       (user_id, facebook_url, github_url, linkedin_url, twitter_url) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, facebook_url, github_url, linkedin_url, twitter_url]
    );
    return result.rows[0];
  }

  // Update socials
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
      `UPDATE user_socials SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

module.exports = UserSocials;
