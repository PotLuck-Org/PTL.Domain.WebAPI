const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserSocials = require('../models/UserSocials');
const UserAddress = require('../models/UserAddress');
const Connection = require('../models/Connection');
const EventAttendee = require('../models/EventAttendee');
const pool = require('../config/database');
const { authenticateToken, ownsResourceOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /profile/{identifier}:
 *   get:
 *     summary: View user profile (supports both ID and username)
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (UUID) or username
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       404:
 *         description: User not found
 */
// GET /api/profile/:identifier - View any user's profile (supports ID or username)
router.get('/profile/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    let currentUserId = null;
    let currentUserRole = 'Member';

    // If user is authenticated, get their info
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.userId);
        
        if (currentUser) {
          currentUserId = currentUser.id;
          currentUserRole = currentUser.role;
        }
      } catch (err) {
        // Token invalid or expired, continue as unauthenticated
      }
    }

    // Try to get user by ID first, then by username
    // Note: IDs can be UUIDs or VARCHAR(10) format depending on database schema
    let user = null;
    
    // First try to find by ID (works for both UUID and VARCHAR ID formats)
    try {
      user = await User.findById(identifier);
      if (user) {
        console.log(`User found by ID: ${identifier}`);
      }
    } catch (err) {
      // If ID lookup throws an error (e.g., database error), log it
      console.error('User lookup by ID error:', err.message);
    }
    
    // If not found by ID, try username
    if (!user) {
      try {
        user = await User.findByUsername(identifier);
        if (user) {
          console.log(`User found by username: ${identifier}`);
        }
      } catch (err) {
        console.error('User lookup by username error:', err.message);
      }
    }

    if (!user) {
      console.log(`User not found with identifier: ${identifier}`);
      return res.status(404).json({ error: 'User not found', identifier: identifier });
    }
    
    // Get profile, socials, address, connection stats, and event stats
    let connectionCount = 0;
    let connectionStatus = null;
    
    try {
      // Try to get connection data (may fail if user_connections table doesn't exist yet)
      [connectionCount, connectionStatus] = await Promise.all([
        Connection.getConnectionCount(user.id).catch((err) => {
          console.log('Connection count query failed:', err.message);
          return 0;
        }),
        currentUserId ? Connection.getConnectionStatus(currentUserId, user.id).catch((err) => {
          console.log('Connection status query failed:', err.message);
          return null;
        }) : Promise.resolve(null)
      ]);
    } catch (err) {
      console.log('Connection queries failed (table may not exist yet):', err.message);
      connectionCount = 0;
      connectionStatus = null;
    }

    // Get profile data with error handling
    let profile, socials, address, eventsHosted, eventsAttendedCount;
    try {
      [profile, socials, address, eventsHosted, eventsAttendedCount] = await Promise.all([
        UserProfile.findByUserId(user.id).catch((err) => {
          console.error('Error fetching profile:', err.message);
          return null;
        }),
        UserSocials.findByUserId(user.id).catch((err) => {
          console.error('Error fetching socials:', err.message);
          return null;
        }),
        UserAddress.findByUserId(user.id).catch((err) => {
          console.error('Error fetching address:', err.message);
          return null;
        }),
        pool.query('SELECT COUNT(*) as count FROM community_events WHERE event_host = $1', [user.id]).catch((err) => {
          console.error('Error fetching events:', err.message);
          return { rows: [{ count: '0' }] };
        }),
        EventAttendee.countCheckedInForUser(user.id).catch((err) => {
          console.error('Error counting attended events:', err.message);
          return 0;
        })
      ]);
    } catch (err) {
      console.error('Error in Promise.all for profile data:', err);
      throw err;
    }

    const profileData = profile || {};
    const socialsData = socials || {};
    const addressData = address || {};
    const eventsHostedCount = parseInt(eventsHosted.rows[0]?.count || 0);
    const eventsAttended = typeof eventsAttendedCount === 'number'
      ? eventsAttendedCount
      : parseInt(eventsAttendedCount?.rows?.[0]?.count || 0, 10);

    // Determine if user can view private fields
    const canViewPrivate = currentUserRole === 'Admin' || 
                           currentUserRole === 'President' || 
                           currentUserId === user.id;

    // Build full name
    const fullName = profileData.firstname && profileData.lastname 
      ? `${profileData.firstname}${profileData.middlename ? ' ' + profileData.middlename + ' ' : ' '}${profileData.lastname}`
      : user.username;

    // Build location string
    const location = addressData.county 
      ? `${addressData.county}${addressData.post_code ? ', ' + addressData.post_code : ''}`
      : null;

    // Get member since year
    const memberSince = user.created_at 
      ? new Date(user.created_at).getFullYear().toString()
      : null;

    // Transform response to match frontend expectations
    const response = {
      id: user.id,
      name: fullName,
      title: profileData.occupation || user.role,
      location: location || 'Not specified',
      memberSince: memberSince || 'Unknown',
      bio: profileData.about || 'No bio available.',
      email: canViewPrivate ? user.email : undefined,
      phone: canViewPrivate ? profileData.phone_number : undefined,
      eventsAttended,
      eventsHosted: eventsHostedCount,
      connections: connectionCount,
      // Connection status for frontend
      connectionStatus: connectionStatus ? connectionStatus.status : null,
      isConnected: connectionStatus?.status === 'accepted',
      // Additional data for backward compatibility
      user: {
        id: user.id,
        email: canViewPrivate ? user.email : undefined,
        username: user.username,
        role: user.role
      },
      profile: canViewPrivate ? profileData : {
        firstname: profileData.firstname,
        lastname: profileData.lastname,
        middlename: profileData.middlename,
        about: profileData.about,
        occupation: profileData.occupation,
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender,
      },
      socials: socialsData,
      address: canViewPrivate ? addressData : undefined
    };

    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /profile:
 *   post:
 *     summary: Create user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               middlename:
 *                 type: string
 *               about:
 *                 type: string
 *               occupation:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               facebook_url:
 *                 type: string
 *               github_url:
 *                 type: string
 *               linkedin_url:
 *                 type: string
 *               twitter_url:
 *                 type: string
 *               street_number:
 *                 type: string
 *               street_address:
 *                 type: string
 *               post_code:
 *                 type: string
 *               county:
 *                 type: string
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       400:
 *         description: Validation error or profile already exists
 *       401:
 *         description: Unauthorized
 */
// POST /api/profile - Create user profile
router.post('/profile', authenticateToken, [
  body('firstname').optional().isLength({ min: 1 }).trim(),
  body('lastname').optional().isLength({ min: 1 }).trim(),
  body('about').optional(),
  body('occupation').optional(),
  body('phone_number').optional(),
  body('date_of_birth').optional().isISO8601().toDate(),
  body('gender').optional().isIn(['Male', 'Female', 'Other']),
  body('facebook_url').optional().isURL(),
  body('github_url').optional().isURL(),
  body('linkedin_url').optional().isURL(),
  body('twitter_url').optional().isURL(),
  body('street_number').optional(),
  body('street_address').optional(),
  body('post_code').optional(),
  body('county').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { 
      firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender,
      facebook_url, github_url, linkedin_url, twitter_url,
      street_number, street_address, post_code, county
    } = req.body;

    // Check if profile already exists using models
    if (await UserProfile.exists(userId)) {
      return res.status(400).json({ error: 'Profile already exists. Use PUT to update.' });
    }

    // Create profile, socials, and address using models
    await Promise.all([
      UserProfile.create({ userId, firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender }),
      UserSocials.create({ userId, facebook_url, github_url, linkedin_url, twitter_url }),
      UserAddress.create({ userId, street_number, street_address, post_code, county })
    ]);

    res.status(201).json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

/**
 * @swagger
 * /profile/{username}:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               middlename:
 *                 type: string
 *               about:
 *                 type: string
 *               occupation:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
// PUT /api/profile/:username - Update profile
router.put('/profile/:username', authenticateToken, [
  body('firstname').optional().trim(),
  body('lastname').optional().trim(),
  body('about').optional(),
  body('occupation').optional(),
  body('phone_number').optional(),
  body('date_of_birth').optional().isISO8601().toDate(),
  body('gender').optional().isIn(['Male', 'Female', 'Other']),
  body('facebook_url').optional().isURL(),
  body('github_url').optional().isURL(),
  body('linkedin_url').optional().isURL(),
  body('twitter_url').optional().isURL(),
  body('street_number').optional(),
  body('street_address').optional(),
  body('post_code').optional(),
  body('county').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Get target user using models
    const targetUser = await User.findByUsername(username);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = targetUser.id;

    // Check permission: only the user themselves, Admin, or President can update
    if (currentUserId !== targetUserId && 
        currentUserRole !== 'Admin' && 
        currentUserRole !== 'President') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { 
      firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender,
      facebook_url, github_url, linkedin_url, twitter_url,
      street_number, street_address, post_code, county
    } = req.body;

    // Update profile, socials, and address using models
    const updateProfile = UserProfile.update(targetUserId, {
      firstname, lastname, middlename, about, occupation, phone_number, date_of_birth, gender
    });

    const updateSocials = UserSocials.update(targetUserId, {
      facebook_url, github_url, linkedin_url, twitter_url
    });

    const updateAddress = UserAddress.update(targetUserId, {
      street_number, street_address, post_code, county
    });

    await Promise.all([updateProfile, updateSocials, updateAddress]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @swagger
 * /profile/connect/{userId}:
 *   post:
 *     summary: Send a connection request to a user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection request sent successfully
 *       400:
 *         description: Cannot connect to yourself
 *       404:
 *         description: User not found
 */
// POST /api/profile/connect/:userId - Send connection request
router.post('/profile/connect/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    if (currentUserId === userId) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check existing connection
    const existingConnection = await Connection.getConnectionStatus(currentUserId, userId);
    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({ error: 'Already connected' });
      }
      if (existingConnection.status === 'pending') {
        return res.status(400).json({ error: 'Connection request already sent' });
      }
    }

    // Create connection request
    const connection = await Connection.createRequest(currentUserId, userId);
    res.json({ message: 'Connection request sent', connection });
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

/**
 * @swagger
 * /profile/connect/{userId}/accept:
 *   post:
 *     summary: Accept a connection request
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection accepted successfully
 *       404:
 *         description: Connection request not found
 */
// POST /api/profile/connect/:userId/accept - Accept connection request
router.post('/profile/connect/:userId/accept', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    const connection = await Connection.acceptRequest(currentUserId, userId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    res.json({ message: 'Connection accepted', connection });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ error: 'Failed to accept connection' });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (for Network page)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
// GET /api/users - Get all users for Network page
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll();
    
    // Get profile and address data for each user
    const usersWithProfiles = await Promise.all(users.map(async (user) => {
      const [profile, address] = await Promise.all([
        UserProfile.findByUserId(user.id),
        UserAddress.findByUserId(user.id)
      ]);

      const profileData = profile || {};
      const addressData = address || {};

      // Build full name
      const fullName = profileData.firstname && profileData.lastname 
        ? `${profileData.firstname}${profileData.middlename ? ' ' + profileData.middlename + ' ' : ' '}${profileData.lastname}`
        : user.username;

      // Build location string
      const location = addressData.county 
        ? `${addressData.county}${addressData.post_code ? ', ' + addressData.post_code : ''}`
        : 'Not specified';

      // Get member since year
      const memberSince = user.created_at 
        ? new Date(user.created_at).getFullYear().toString()
        : 'Unknown';

      return {
        id: user.id,
        name: fullName,
        title: profileData.occupation || user.role,
        location: location,
        memberSince: memberSince,
        avatar: null // Can be extended later with profile pictures
      };
    }));

    res.json(usersWithProfiles);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;