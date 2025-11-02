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
 *     summary: List all timeline posts with pagination (authenticated users only)
 *     tags: [Timeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: Paginated list of timeline posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Timeline'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPosts:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
// GET /api/timeline - List all timeline posts with pagination (authenticated users only)
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10)); // Max 100 per page
    
    // Get paginated posts and total count
    const [posts, totalPosts] = await Promise.all([
      Timeline.findAllPaginated(page, limit),
      Timeline.count()
    ]);
    
    const totalPages = Math.ceil(totalPosts / limit);
    
    res.json({
      posts,
      pagination: {
        currentPage: page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
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
 *               title:
 *                 type: string
 *                 description: Optional title for the post
 *               content:
 *                 type: string
 *               image_url:
 *                 type: string
 *                 description: Optional image URL (must be valid URL if provided)
 *               attachment_url:
 *                 type: string
 *                 description: Optional attachment URL (must be valid URL if provided)
 *               attachment_name:
 *                 type: string
 *                 description: Optional name for the attachment
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
  body('title').optional(),
  body('content').notEmpty().withMessage('Content is required'),
  body('image_url')
    .optional()
    .custom((value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('Invalid image URL'),
  body('attachment_url')
    .optional()
    .custom((value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('Invalid attachment URL'),
  body('attachment_name').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, image_url, attachment_url, attachment_name } = req.body;
    const author_id = req.user.id;

    // Convert empty strings to null for optional fields
    const post = await Timeline.create({ 
      title: title || null, 
      content, 
      image_url: image_url || null, 
      attachment_url: attachment_url || null, 
      attachment_name: attachment_name || null, 
      author_id 
    });

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
 *               title:
 *                 type: string
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
  body('title').optional(),
  body('content').optional().notEmpty(),
  body('image_url')
    .optional()
    .custom((value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('Invalid image URL'),
  body('attachment_url')
    .optional()
    .custom((value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('Invalid attachment URL'),
  body('attachment_name').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content, image_url, attachment_url, attachment_name } = req.body;

    // Check if post exists
    if (!(await Timeline.exists(id))) {
      return res.status(404).json({ error: 'Timeline post not found' });
    }

    // Build update object, converting empty strings to null and only including defined fields
    const updateFields = {};
    if (title !== undefined) updateFields.title = title || null;
    if (content !== undefined) updateFields.content = content;
    if (image_url !== undefined) updateFields.image_url = image_url || null;
    if (attachment_url !== undefined) updateFields.attachment_url = attachment_url || null;
    if (attachment_name !== undefined) updateFields.attachment_name = attachment_name || null;

    // Update post
    const post = await Timeline.update(id, updateFields);

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
