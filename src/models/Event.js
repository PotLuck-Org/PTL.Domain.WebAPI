const pool = require('../config/database');

class Event {
  // Find event by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM community_events WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const event = result.rows[0];
    
    // Get host info if event has a host user ID
    if (event.event_host) {
      const hostResult = await pool.query(
        'SELECT username, email FROM users WHERE id = $1',
        [event.event_host]
      );
      if (hostResult.rows.length > 0) {
        event.host_username = hostResult.rows[0].username;
        event.host_email = hostResult.rows[0].email;
      } else {
        // If user not found, use event_host_name if available
        event.host_username = event.event_host_name || null;
        event.host_email = null;
      }
    } else if (event.event_host_name) {
      // If only event_host_name is set
      event.host_username = event.event_host_name;
      event.host_email = null;
    }
    
    return event;
  }

  // Find all events
  static async findAll() {
    const result = await pool.query(
      `SELECT * FROM community_events 
       ORDER BY event_date DESC, event_time DESC`
    );
    
    // Get host info for each event
    const events = await Promise.all(result.rows.map(async (event) => {
      if (event.event_host) {
        const hostResult = await pool.query(
          'SELECT username, email FROM users WHERE id = $1',
          [event.event_host]
        );
        if (hostResult.rows.length > 0) {
          event.host_username = hostResult.rows[0].username;
          event.host_email = hostResult.rows[0].email;
        } else {
          // If user not found, use event_host_name if available
          event.host_username = event.event_host_name || null;
          event.host_email = null;
        }
      } else if (event.event_host_name) {
        // If only event_host_name is set
        event.host_username = event.event_host_name;
        event.host_email = null;
      }
      return event;
    }));
    
    return events;
  }

  // Find all events with pagination
  static async findAllPaginated(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT * FROM community_events 
       ORDER BY event_date DESC, event_time DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    // Get host info for each event
    const events = await Promise.all(result.rows.map(async (event) => {
      if (event.event_host) {
        const hostResult = await pool.query(
          'SELECT username, email FROM users WHERE id = $1',
          [event.event_host]
        );
        if (hostResult.rows.length > 0) {
          event.host_username = hostResult.rows[0].username;
          event.host_email = hostResult.rows[0].email;
        } else {
          // If user not found, use event_host_name if available
          event.host_username = event.event_host_name || null;
          event.host_email = null;
        }
      } else if (event.event_host_name) {
        // If only event_host_name is set
        event.host_username = event.event_host_name;
        event.host_email = null;
      }
      return event;
    }));
    
    return events;
  }

  // Count total events
  static async count() {
    const result = await pool.query('SELECT COUNT(*) FROM community_events');
    return parseInt(result.rows[0].count, 10);
  }

  // Create event
  static async create({ event_name, event_address, event_time, event_date, event_description, event_host, event_host_name }) {
    const result = await pool.query(
      `INSERT INTO community_events 
       (event_name, event_address, event_time, event_date, event_description, event_host, event_host_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [event_name, event_address, event_time, event_date, event_description, event_host || null, event_host_name || null]
    );
    return result.rows[0];
  }

  // Update event
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
      `UPDATE community_events SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Delete event
  static async delete(id) {
    await pool.query('DELETE FROM community_events WHERE id = $1', [id]);
    return true;
  }

  // Check if event exists
  static async exists(id) {
    const result = await pool.query('SELECT id FROM community_events WHERE id = $1', [id]);
    return result.rows.length > 0;
  }
}

module.exports = Event;
