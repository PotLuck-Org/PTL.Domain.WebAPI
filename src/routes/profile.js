const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserSocials = require('../models/UserSocials');
const UserAddress = require('../models/UserAddress');
const { authenticateToken, ownsResourceOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /profile/{username}:
 *   get:
 *     summary: View user profile
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       404:
 *         description: User not found
 */
// GET /api/profile/:username - View any user's profile (public fields only)
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
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

    // Get user by username using models
    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get profile, socials, and address using models
    const [profile, socials, address] = await Promise.all([
      UserProfile.findByUserId(user.id),
      UserSocials.findByUserId(user.id),
      UserAddress.findByUserId(user.id)
    ]);

    const profileData = profile || {};
    const socialsData = socials || {};
    const addressData = address || {};

    // Determine if user can view private fields
    const canViewPrivate = currentUserRole === 'Admin' || 
                           currentUserRole === 'President' || 
                           currentUserId === user.id;

    // Prepare response
    const response = {
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
        // phone_number excluded for non-authorities
      },
      socials: socialsData,
      address: canViewPrivate ? addressData : undefined
    };

    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
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
      firstname, lastname, middlename, about, occupation, phone_number, date_of_birth,
      facebook_url, github_url, linkedin_url, twitter_url,
      street_number, street_address, post_code, county
    } = req.body;

    // Check if profile already exists using models
    if (await UserProfile.exists(userId)) {
      return res.status(400).json({ error: 'Profile already exists. Use PUT to update.' });
    }

    // Create profile, socials, and address using models
    await Promise.all([
      UserProfile.create({ userId, firstname, lastname, middlename, about, occupation, phone_number, date_of_birth }),
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
      firstname, lastname, middlename, about, occupation, phone_number, date_of_birth,
      facebook_url, github_url, linkedin_url, twitter_url,
      street_number, street_address, post_code, county
    } = req.body;

    // Update profile, socials, and address using models
    const updateProfile = UserProfile.update(targetUserId, {
      firstname, lastname, middlename, about, occupation, phone_number, date_of_birth
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

module.exports = router;