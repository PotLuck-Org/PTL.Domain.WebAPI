const express = require('express');
const { body, validationResult } = require('express-validator');
const Timeline = require('../models/Timeline');
const { authenticateToken } = require('../middleware/auth');
const checkRoleAccess = require('../middleware/roleAccess');

const router = express.Router();

/**
 * @swagger
 * /timeline:
 *   get:
 *     summary: List all timeline posts (authenticated users only)
 *     tags: [Timeline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all timeline posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Timeline'
 *       401:
 *         description: Unauthorized
 */
// GET /api/timeline - List all timeline posts (authenticated users only)
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const posts = await Timeline.findAll();
    res.json({ posts });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline posts' });
  }
});

/**
 * @swagger
 * /timeline:
 *   post:
 *     summary: Create timeline post (Admin & President only)
 *     tags: [Timeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               image_url:
 *                 type: string
 *               attachment_url:
 *                 type: string
 *               attachment_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Timeline post created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
// POST /api/timeline - Create timeline post (Admin & President only)
router.post('/timeline', authenticateToken, checkRoleAccess(['Admin', 'President']), [
  body('content').notEmpty().withMessage('Content is required'),
  body('image_url').optional().isURL().withMessage('Invalid image URL'),
  body('attachment_url').optional().isURL().withMessage('Invalid attachment URL'),
  body('attachment_name').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, image_url, attachment_url, attachment_name } = req.body;
    const author_id = req.user.id;

    const post = await Timeline.create({ content, image_url, attachment_url, attachment_name, author_id });

    res.status(201).json({ 
      message: 'Timeline post created successfully',
      post
    });
  } catch (error) {
    console.error('Create timeline post error:', error);
    res.status(500).json({ error: 'Failed to create timeline post' });
  }
});

/**
 * @swagger
 * /timeline/{id}:
 *   put:
 *     summary: Update timeline post (Admin & President only)
 *     tags: [Timeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               image_url:
 *                 type: string
 *               attachment_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timeline post updated successfully
 *       404:
 *         description: Timeline post not found
 */
// PUT /api/timeline/:id - Update timeline post (Admin & President only)
router.put('/timeline/:id', authenticateToken, checkRoleAccess(['Admin', 'President']), [
  body('content').optional().notEmpty(),
  body('image_url').optional().isURL(),
  body('attachment_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content, image_url, attachment_url, attachment_name } = req.body;

    // Check if post exists
    if (!(await Timeline.exists(id))) {
      return res.status(404).json({ error: 'Timeline post not found' });
    }

    // Update post
    const post = await Timeline.update(id, { content, image_url, attachment_url, attachment_name });

    res.json({ 
      message: 'Timeline post updated successfully',
      post
    });
  } catch (error) {
    console.error('Update timeline post error:', error);
    res.status(500).json({ error: 'Failed to update timeline post' });
  }
});

/**
 * @swagger
 * /timeline/{id}:
 *   delete:
 *     summary: Delete timeline post (Admin & President only)
 *     tags: [Timeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timeline post deleted successfully
 *       404:
 *         description: Timeline post not found
 */
// DELETE /api/timeline/:id - Delete timeline post (Admin & President only)
router.delete('/timeline/:id', authenticateToken, checkRoleAccess(['Admin', 'President']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists
    if (!(await Timeline.exists(id))) {
      return res.status(404).json({ error: 'Timeline post not found' });
    }

    await Timeline.delete(id);

    res.json({ message: 'Timeline post deleted successfully' });
  } catch (error) {
    console.error('Delete timeline post error:', error);
    res.status(500).json({ error: 'Failed to delete timeline post' });
  }
});

module.exports = router;
