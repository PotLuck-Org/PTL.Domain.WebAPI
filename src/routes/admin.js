const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Blog = require('../models/Blog');
const RolePermission = require('../models/RolePermission');
const { authenticateToken } = require('../middleware/auth');
const checkRoleAccess = require('../middleware/roleAccess');

const router = express.Router();

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [Admin, Member, President, Secretary]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid role
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
// PUT /api/admin/users/:userId/role - Update user role (Admin only)
router.put('/admin/users/:userId/role', authenticateToken, checkRoleAccess(['Admin']), [
  body('role').isIn(['Admin', 'Member', 'President', 'Secretary']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Prevent self-demotion of admin
    if (req.user.id === userId && role !== 'Admin') {
      return res.status(400).json({ 
        error: 'You cannot change your own role from Admin' 
      });
    }

    // Check if user exists using models
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update role using models
    const user = await User.updateRole(userId, role);

    res.json({ 
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Access denied
 */
// GET /api/admin/users - List all users (Admin only)
router.get('/admin/users', authenticateToken, checkRoleAccess(['Admin']), async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * @swagger
 * /admin/users/{userId}/activate:
 *   put:
 *     summary: Activate or deactivate user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User activation status updated
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
// PUT /api/admin/users/:userId/activate - Activate/deactivate user (Admin only)
router.put('/admin/users/:userId/activate', authenticateToken, checkRoleAccess(['Admin']), [
  body('is_active').isBoolean().withMessage('is_active must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { is_active } = req.body;

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update activation status
    const user = await User.updateActiveStatus(userId, is_active);

    res.json({ 
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update activation error:', error);
    res.status(500).json({ error: 'Failed to update user activation status' });
  }
});

/**
 * @swagger
 * /admin/blogs/{id}/approve:
 *   put:
 *     summary: Approve blog post (Admin only)
 *     tags: [Admin]
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
 *         description: Blog post approved
 *       404:
 *         description: Blog post not found
 */
// PUT /api/admin/blogs/:id/approve - Approve blog post (Admin only)
router.put('/admin/blogs/:id/approve', authenticateToken, checkRoleAccess(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if blog exists using models
    if (!(await Blog.exists(id))) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Approve blog using models
    const blog = await Blog.approve(id);

    res.json({ 
      message: 'Blog post approved',
      blog
    });
  } catch (error) {
    console.error('Approve blog error:', error);
    res.status(500).json({ error: 'Failed to approve blog post' });
  }
});

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: Get all role permissions (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of role permissions
 *       403:
 *         description: Access denied
 */
// GET /api/admin/roles - Get all role permissions (Admin only)
router.get('/admin/roles', authenticateToken, checkRoleAccess(['Admin']), async (req, res) => {
  try {
    const roles = await RolePermission.findAll();
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get role permissions' });
  }
});

/**
 * @swagger
 * /admin/roles/{role}:
 *   put:
 *     summary: Update role permissions (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Admin, Member, President, Secretary]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 *       400:
 *         description: Invalid permissions
 *       404:
 *         description: Role not found
 */
// PUT /api/admin/roles/:role - Update role permissions (Admin only)
router.put('/admin/roles/:role', authenticateToken, checkRoleAccess(['Admin']), [
  body('permissions').isArray().withMessage('Permissions must be an array'),
  body('permissions.*').isString().withMessage('Each permission must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.params;
    const { permissions } = req.body;

    // Validate role
    const validRoles = ['Admin', 'Member', 'President', 'Secretary'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update permissions using models
    const updatedRole = await RolePermission.update(role, permissions);

    if (!updatedRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ 
      message: 'Role permissions updated successfully',
      role: updatedRole
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

module.exports = router;