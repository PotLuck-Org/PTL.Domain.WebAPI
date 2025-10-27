const express = require('express');
const { body, validationResult } = require('express-validator');
const Poll = require('../models/Poll');
const { authenticateToken } = require('../middleware/auth');
const checkRoleAccess = require('../middleware/roleAccess');

const router = express.Router();

/**
 * @swagger
 * /polls:
 *   get:
 *     summary: List all active polls with results
 *     tags: [Polls]
 *     responses:
 *       200:
 *         description: List of all polls with vote counts
 */
// GET /api/polls - List all polls with results
router.get('/polls', async (req, res) => {
  try {
    const polls = await Poll.findAll();
    res.json({ polls });
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ error: 'Failed to get polls' });
  }
});

/**
 * @swagger
 * /polls/{id}:
 *   get:
 *     summary: Get poll details with results
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Poll with results and vote percentages
 *       404:
 *         description: Poll not found
 */
// GET /api/polls/:id - Get poll with results
router.get('/polls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const poll = await Poll.getResults(id);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ poll });
  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({ error: 'Failed to get poll' });
  }
});

/**
 * @swagger
 * /polls:
 *   post:
 *     summary: Create a new poll (Authenticated users)
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - options
 *             properties:
 *               question:
 *                 type: string
 *               description:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Poll created successfully
 *       400:
 *         description: Validation error
 */
// POST /api/polls - Create a new poll
router.post('/polls', authenticateToken, [
  body('question').notEmpty().withMessage('Question is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options required'),
  body('options.*').notEmpty().withMessage('Option text cannot be empty'),
  body('expires_at').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, description, options, expires_at } = req.body;
    const created_by = req.user.id;

    // Create poll
    const poll = await Poll.create({ question, description, created_by, expires_at });

    // Add options
    const addedOptions = await Poll.addOptions(poll.id, options);
    poll.options = addedOptions;

    res.status(201).json({ 
      message: 'Poll created successfully',
      poll
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

/**
 * @swagger
 * /polls/{id}/vote:
 *   post:
 *     summary: Vote on a poll (Authenticated users)
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - option_id
 *             properties:
 *               option_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Poll or option not found
 */
// POST /api/polls/:id/vote - Vote on a poll
router.post('/polls/:id/vote', authenticateToken, [
  body('option_id').notEmpty().withMessage('option_id is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { option_id } = req.body;
    const user_id = req.user.id;

    // Check if poll exists
    if (!(await Poll.exists(id))) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Record vote (or update if user already voted)
    await Poll.vote(user_id, id, option_id);

    // Get updated results
    const poll = await Poll.getResults(id);

    res.json({ 
      message: 'Vote recorded successfully',
      poll
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

module.exports = router;
