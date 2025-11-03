const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const checkRoleAccess = require('../middleware/roleAccess');

const router = express.Router();

/**
 * @swagger
 * /events/users:
 *   get:
 *     summary: Get list of users for event host selection (Admin & Secretary only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
// GET /api/events/users - Get users list for event host dropdown (Admin & Secretary only)
router.get('/events/users', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users for events error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events with pagination
 *     tags: [Events]
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
 *         description: Number of events per page
 *     responses:
 *       200:
 *         description: Paginated list of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalEvents:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 */
// GET /api/events - List all events with pagination (accessible by everyone)
router.get('/events', async (req, res) => {
  try {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10)); // Max 100 per page
    
    // Get paginated events and total count
    const [events, totalEvents] = await Promise.all([
      Event.findAllPaginated(page, limit),
      Event.count()
    ]);
    
    const totalPages = Math.ceil(totalEvents / limit);
    
    res.json({
      events,
      pagination: {
        currentPage: page,
        limit,
        totalEvents,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create new event (Admin & Secretary only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_name
 *               - event_date
 *             properties:
 *               event_name:
 *                 type: string
 *               event_address:
 *                 type: string
 *               event_time:
 *                 type: string
 *               event_date:
 *                 type: string
 *               event_description:
 *                 type: string
 *               event_host:
 *                 type: string
 *                 description: Optional user ID for the event host
 *               event_host_name:
 *                 type: string
 *                 description: Optional custom host name (used if event_host is not provided or user not found)
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
// POST /api/events - Create new event (Admin & Secretary only)
router.post('/events', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), [
  body('event_name').notEmpty().withMessage('Event name is required'),
  body('event_date').notEmpty().withMessage('Event date is required'),
  body('event_description').optional(),
  body('event_host').optional(),
  body('event_host_name').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { event_name, event_address, event_time, event_date, event_description, event_host, event_host_name } = req.body;
    
    // If event_host is provided, verify it exists. If not found or not provided, use event_host_name or current user
    let final_event_host = null;
    let final_event_host_name = event_host_name || null;
    
    if (event_host) {
      const hostUser = await User.findById(event_host);
      if (hostUser) {
        final_event_host = event_host;
      } else {
        // User not found, use event_host_name if provided, otherwise use event_host as name
        final_event_host_name = event_host_name || event_host || null;
      }
    } else if (!event_host_name) {
      // Default to current user if neither event_host nor event_host_name is provided
      final_event_host = req.user.id;
    }

    const event = await Event.create({ 
      event_name, 
      event_address, 
      event_time, 
      event_date, 
      event_description, 
      event_host: final_event_host,
      event_host_name: final_event_host_name
    });

    res.status(201).json({ 
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Update event (Admin & Secretary only)
 *     tags: [Events]
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
 *               event_name:
 *                 type: string
 *               event_address:
 *                 type: string
 *               event_time:
 *                 type: string
 *               event_date:
 *                 type: string
 *               event_description:
 *                 type: string
 *               event_host:
 *                 type: string
 *                 description: Optional user ID for the event host
 *               event_host_name:
 *                 type: string
 *                 description: Optional custom host name (used if event_host is not provided or user not found)
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found
 */
// PUT /api/events/:id - Update event (Admin & Secretary only)
router.put('/events/:id', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), [
  body('event_name').optional().notEmpty(),
  body('event_description').optional(),
  body('event_host').optional(),
  body('event_host_name').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { event_name, event_address, event_time, event_date, event_description, event_host, event_host_name } = req.body;

    // Check if event exists using models
    if (!(await Event.exists(id))) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Build update fields
    const updateFields = {};
    if (event_name !== undefined) updateFields.event_name = event_name;
    if (event_address !== undefined) updateFields.event_address = event_address;
    if (event_time !== undefined) updateFields.event_time = event_time;
    if (event_date !== undefined) updateFields.event_date = event_date;
    if (event_description !== undefined) updateFields.event_description = event_description;
    
    // Handle event_host and event_host_name
    if (event_host !== undefined) {
      if (event_host) {
        const hostUser = await User.findById(event_host);
        if (hostUser) {
          updateFields.event_host = event_host;
          updateFields.event_host_name = null; // Clear custom name if valid user is set
        } else {
          // User not found, set as custom name
          updateFields.event_host = null;
          updateFields.event_host_name = event_host_name || event_host;
        }
      } else {
        // event_host is null/empty, use event_host_name if provided
        updateFields.event_host = null;
        if (event_host_name !== undefined) {
          updateFields.event_host_name = event_host_name || null;
        }
      }
    } else if (event_host_name !== undefined) {
      // Only event_host_name is being updated
      updateFields.event_host_name = event_host_name || null;
    }

    // Update event using models
    const event = await Event.update(id, updateFields);

    res.json({ 
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete event (Admin & Secretary only)
 *     tags: [Events]
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
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 */
// DELETE /api/events/:id - Delete event (Admin & Secretary only)
router.delete('/events/:id', authenticateToken, checkRoleAccess(['Admin', 'Secretary']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists using models
    if (!(await Event.exists(id))) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await Event.delete(id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;