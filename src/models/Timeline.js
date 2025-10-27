const pool = require('../config/database');

class Timeline {
  // Find timeline post by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM timeline_posts WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const post = result.rows[0];
    
    // Get author info if post has an author
    if (post.author_id) {
      const authorResult = await pool.query(
        'SELECT username, email FROM users WHERE id = $1',
        [post.author_id]
      );
      if (authorResult.rows.length > 0) {
        post.author_username = authorResult.rows[0].username;
        post.author_email = authorResult.rows[0].email;
      }
    }
    
    return post;
  }

  // Find all timeline posts
  static async findAll() {
    const result = await pool.query(
      `SELECT * FROM timeline_posts 
       ORDER BY created_at DESC`
    );
    
    // Get author info for each post
    const posts = await Promise.all(result.rows.map(async (post) => {
      if (post.author_id) {
        const authorResult = await pool.query(
          'SELECT username, email FROM users WHERE id = $1',
          [post.author_id]
        );
        if (authorResult.rows.length > 0) {
          post.author_username = authorResult.rows[0].username;
          post.author_email = authorResult.rows[0].email;
        }
      }
      return post;
    }));
    
    return posts;
  }

  // Create timeline post
  static async create({ content, image_url, attachment_url, attachment_name, author_id }) {
    const result = await pool.query(
      `INSERT INTO timeline_posts (content, image_url, attachment_url, attachment_name, author_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [content, image_url, attachment_url, attachment_name, author_id]
    );
    return result.rows[0];
  }

  // Update timeline post
  static async update(id, fields) {
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

    values.push(id);
    const result = await pool.query(
      `UPDATE timeline_posts SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Delete timeline post
  static async delete(id) {
    await pool.query('DELETE FROM timeline_posts WHERE id = $1', [id]);
    return true;
  }

  // Check if timeline post exists
  static async exists(id) {
    const result = await pool.query('SELECT id FROM timeline_posts WHERE id = $1', [id]);
    return result.rows.length > 0;
  }
}

module.exports = Timeline;
