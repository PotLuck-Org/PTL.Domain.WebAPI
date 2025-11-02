const pool = require('../config/database');

class Blog {
  // Find blog by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT b.*, u.username as author
       FROM blog_posts b
       LEFT JOIN users u ON b.author_id = u.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Find all blogs
  static async findAll(showUnapproved = false) {
    const query = showUnapproved
      ? 'SELECT * FROM blog_posts ORDER BY created_at DESC'
      : 'SELECT * FROM blog_posts WHERE is_available = true ORDER BY created_at DESC';
    
    const result = await pool.query(query);
    
    // Get author info for each blog
    const blogsWithAuthors = await Promise.all(result.rows.map(async (blog) => {
      if (blog.author_id) {
        const authorResult = await pool.query(
          'SELECT username FROM users WHERE id = $1',
          [blog.author_id]
        );
        if (authorResult.rows.length > 0) {
          blog.author = authorResult.rows[0].username;
        }
      }
      return blog;
    }));

    return blogsWithAuthors;
  }

  // Find all blogs with pagination
  static async findAllPaginated(page = 1, limit = 10, showUnapproved = false) {
    const offset = (page - 1) * limit;
    
    const query = showUnapproved
      ? `SELECT * FROM blog_posts 
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`
      : `SELECT * FROM blog_posts 
         WHERE is_available = true 
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`;
    
    const result = await pool.query(query, [limit, offset]);
    
    // Get author info for each blog
    const blogsWithAuthors = await Promise.all(result.rows.map(async (blog) => {
      if (blog.author_id) {
        const authorResult = await pool.query(
          'SELECT username FROM users WHERE id = $1',
          [blog.author_id]
        );
        if (authorResult.rows.length > 0) {
          blog.author = authorResult.rows[0].username;
        }
      }
      return blog;
    }));

    return blogsWithAuthors;
  }

  // Count total blogs
  static async count(showUnapproved = false) {
    const query = showUnapproved
      ? 'SELECT COUNT(*) FROM blog_posts'
      : 'SELECT COUNT(*) FROM blog_posts WHERE is_available = true';
    
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }

  // Create blog
  static async create({ title, blog_content, author_id, is_available = false }) {
    const result = await pool.query(
      `INSERT INTO blog_posts (title, blog_content, is_available, author_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, blog_content, is_available, author_id]
    );
    return result.rows[0];
  }

  // Update blog
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
      `UPDATE blog_posts SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Approve blog
  static async approve(id) {
    const result = await pool.query(
      'UPDATE blog_posts SET is_available = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Delete blog
  static async delete(id) {
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
    return true;
  }

  // Check if blog exists
  static async exists(id) {
    const result = await pool.query('SELECT id FROM blog_posts WHERE id = $1', [id]);
    return result.rows.length > 0;
  }
}

module.exports = Blog;
