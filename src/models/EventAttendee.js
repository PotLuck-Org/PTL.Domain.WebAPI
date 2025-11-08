const pool = require('../config/database');

class EventAttendee {
  static async rsvp(eventId, userId) {
    const result = await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status, checked_in_at, checked_in_by)
       VALUES ($1, $2, 'registered', NULL, NULL)
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = 'registered',
                     checked_in_at = NULL,
                     checked_in_by = NULL,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [eventId, userId]
    );
    return result.rows[0];
  }

  static async cancel(eventId, userId) {
    const result = await pool.query(
      `UPDATE event_attendees
       SET status = 'cancelled',
           checked_in_at = NULL,
           checked_in_by = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $1 AND user_id = $2
       RETURNING *`,
      [eventId, userId]
    );
    return result.rows[0];
  }

  static async confirmAttendance(eventId, userId, confirmedBy) {
    const result = await pool.query(
      `UPDATE event_attendees
       SET status = 'checked_in',
           checked_in_at = CURRENT_TIMESTAMP,
           checked_in_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $1 AND user_id = $2
       RETURNING *`,
      [eventId, userId, confirmedBy]
    );

    // If attendee hasn't RSVP'd yet, create record as checked in
    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO event_attendees (event_id, user_id, status, checked_in_at, checked_in_by)
         VALUES ($1, $2, 'checked_in', CURRENT_TIMESTAMP, $3)
         ON CONFLICT (event_id, user_id)
         DO UPDATE SET status = 'checked_in',
                       checked_in_at = CURRENT_TIMESTAMP,
                       checked_in_by = $3,
                       updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [eventId, userId, confirmedBy]
      );
      return insertResult.rows[0];
    }

    return result.rows[0];
  }

  static async getStatus(eventId, userId) {
    const result = await pool.query(
      `SELECT * FROM event_attendees WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    return result.rows[0] || null;
  }

  static async getAttendees(eventId) {
    const result = await pool.query(
      `SELECT ea.*, u.username, u.email, u.role
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1`,
      [eventId]
    );
    return result.rows;
  }

  static async countCheckedInForUser(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM event_attendees
       WHERE user_id = $1 AND status = 'checked_in'`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  static async countRegisteredForEvent(eventId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM event_attendees
       WHERE event_id = $1 AND status IN ('registered', 'checked_in')`,
      [eventId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  static async countCheckedInForEvent(eventId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM event_attendees
       WHERE event_id = $1 AND status = 'checked_in'`,
      [eventId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

module.exports = EventAttendee;

