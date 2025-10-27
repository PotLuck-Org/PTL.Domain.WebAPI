const express = require('express');
const { body, validationResult } = require('express-validator');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const checkRoleAccess = require('../middleware/roleAccess');

const router = express.Router();

/**
 * @swagger
 * /blogs:
 *   get:
 *     summary: List all blog posts
 *     tags: [Blogs]
 *     responses:
 *       200:
 *         description: List of all blog posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Blog'
 */
// GET /api/blogs - List all blog posts (accessible by everyone)
router.get('/blogs', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    let isAdmin = false;

    // If user is authenticated and is Admin, show all blogs including unapproved
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && user.role === 'Admin') {
          isAdmin = true;
        }
      } catch (err) {
        // Not authenticated or invalid token
      }
    }

    const blogs = await Blog.findAll(isAdmin);

    res.json({ blogs });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ error: 'Failed to get blogs' });
  }
});

/**
 * @swagger
 * /blogs:
 *   post:
 *     summary: Create blog post (Admin & Secretary only)
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - blog_content
 *             properties:
 *               title:
 *                 type: string
 *               blog_content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Blog post created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
// POST /api/blogs - Create blog post (Admin & Secretary only; Admin blogs auto-approved)
router.post('/blogs', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), [
  body('title').notEmpty().withMessage('Title is required'),
  body('blog_content').notEmpty().withMessage('Blog content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, blog_content } = req.body;
    const author_id = req.user.id;
    
    // Automatically approve if created by Admin
    const is_available = req.user.role === 'Admin';

    const blog = await Blog.create({ title, blog_content, author_id, is_available });

    res.status(201).json({ 
      message: 'Blog post created successfully',
      blog
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

/**
 * @swagger
 * /blogs/{id}:
 *   put:
 *     summary: Update blog post (Admin & Secretary only)
 *     tags: [Blogs]
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
 *               blog_content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Blog post updated successfully
 *       404:
 *         description: Blog post not found
 */
// PUT /api/blogs/:id - Update blog post (Admin & Secretary only)
router.put('/blogs/:id', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), [
  body('title').optional().notEmpty(),
  body('blog_content').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, blog_content } = req.body;

    // Check if blog exists using models
    if (!(await Blog.exists(id))) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Update blog using models
    const blog = await Blog.update(id, { title, blog_content });

    res.json({ 
      message: 'Blog post updated successfully',
      blog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

/**
 * @swagger
 * /blogs/{id}:
 *   delete:
 *     summary: Delete blog post (Admin & Secretary only)
 *     tags: [Blogs]
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
 *         description: Blog post deleted successfully
 *       404:
 *         description: Blog post not found
 */
// DELETE /api/blogs/:id - Delete blog post (Admin & Secretary only)
router.delete('/blogs/:id', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if blog exists using models
    if (!(await Blog.exists(id))) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    await Blog.delete(id);

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

module.exports = router;