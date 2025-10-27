const pool = require('../config/database');

class Poll {
  // Find poll by ID with results
  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM polls WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const poll = result.rows[0];
    
    // Get creator info
    if (poll.created_by) {
      const creatorResult = await pool.query(
        'SELECT username, email FROM users WHERE id = $1',
        [poll.created_by]
      );
      if (creatorResult.rows.length > 0) {
        poll.creator_username = creatorResult.rows[0].username;
        poll.creator_email = creatorResult.rows[0].email;
      }
    }
    
    // Get poll options with vote counts
    const optionsResult = await pool.query(
      `SELECT po.*, 
              COUNT(pv.id) as vote_count
       FROM poll_options po
       LEFT JOIN poll_votes pv ON po.id = pv.option_id
       WHERE po.poll_id = $1
       GROUP BY po.id
       ORDER BY po.created_at`,
      [id]
    );
    
    poll.options = optionsResult.rows;
    
    // Get total votes for this poll
    const totalVotesResult = await pool.query(
      'SELECT COUNT(*) as total FROM poll_votes WHERE poll_id = $1',
      [id]
    );
    poll.total_votes = parseInt(totalVotesResult.rows[0].total);
    
    return poll;
  }

  // Find all polls
  static async findAll() {
    const result = await pool.query(
      `SELECT * FROM polls 
       WHERE is_active = true
       ORDER BY created_at DESC`
    );
    
    // Get options and vote counts for each poll
    const polls = await Promise.all(result.rows.map(async (poll) => {
      // Get creator
      if (poll.created_by) {
        const creatorResult = await pool.query(
          'SELECT username FROM users WHERE id = $1',
          [poll.created_by]
        );
        if (creatorResult.rows.length > 0) {
          poll.creator_username = creatorResult.rows[0].username;
        }
      }
      
      // Get options with vote counts
      const optionsResult = await pool.query(
        `SELECT po.*, 
                COUNT(pv.id) as vote_count
         FROM poll_options po
         LEFT JOIN poll_votes pv ON po.id = pv.option_id
         WHERE po.poll_id = $1
         GROUP BY po.id
         ORDER BY po.created_at`,
        [poll.id]
      );
      
      poll.options = optionsResult.rows;
      
      // Get total votes
      const totalVotesResult = await pool.query(
        'SELECT COUNT(*) as total FROM poll_votes WHERE poll_id = $1',
        [poll.id]
      );
      poll.total_votes = parseInt(totalVotesResult.rows[0].total);
      
      return poll;
    }));
    
    return polls;
  }

  // Create poll
  static async create({ question, description, created_by, expires_at }) {
    const result = await pool.query(
      `INSERT INTO polls (question, description, created_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [question, description, created_by, expires_at]
    );
    return result.rows[0];
  }

  // Add poll options
  static async addOptions(pollId, options) {
    const addedOptions = [];
    
    for (const optionText of options) {
      const result = await pool.query(
        `INSERT INTO poll_options (poll_id, option_text)
         VALUES ($1, $2)
         RETURNING *`,
        [pollId, optionText]
      );
      addedOptions.push(result.rows[0]);
    }
    
    return addedOptions;
  }

  // Vote on a poll
  static async vote(userId, pollId, optionId) {
    // Check if user already voted
    const existingVote = await pool.query(
      'SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, userId]
    );
    
    if (existingVote.rows.length > 0) {
      // Update existing vote
      const result = await pool.query(
        `UPDATE poll_votes 
         SET option_id = $1 
         WHERE poll_id = $2 AND user_id = $3
         RETURNING *`,
        [optionId, pollId, userId]
      );
      return result.rows[0];
    } else {
      // Create new vote
      const result = await pool.query(
        `INSERT INTO poll_votes (poll_id, option_id, user_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [pollId, optionId, userId]
      );
      return result.rows[0];
    }
  }

  // Get poll results with percentages
  static async getResults(pollId) {
    const poll = await this.findById(pollId);
    
    if (!poll) {
      return null;
    }
    
    // Calculate percentages
    const optionsWithPercentages = poll.options.map(option => ({
      ...option,
      vote_percentage: poll.total_votes > 0 
        ? ((parseInt(option.vote_count) / poll.total_votes) * 100).toFixed(2)
        : 0
    }));
    
    poll.options = optionsWithPercentages;
    
    return poll;
  }

  // Check if poll exists
  static async exists(id) {
    const result = await pool.query('SELECT id FROM polls WHERE id = $1', [id]);
    return result.rows.length > 0;
  }
}

module.exports = Poll;
