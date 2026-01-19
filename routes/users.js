import express from 'express';
import {
  getUserById,
  updateUserProfile,
  deactivateUser,
  getPatientAssignedTherapists,
  getTherapistInfo,
  getAllUsers,
  searchUsers
} from '../services/userService.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// GET /api/users/profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    res.json({
      user
    });
  } catch (error) {
    logger.error('User profile fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/users/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const updates = req.body;

    const updatedUser = await updateUserProfile(req.user.id, updates);

    res.json({
      message: 'Profile updated',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Profile update error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users/:userId
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await getUserById(userId);

    // Hide sensitive fields based on role
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      delete user.email;
      delete user.phone_number;
    }

    res.json({ user });
  } catch (error) {
    logger.error('User fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users/therapist/:therapistId/info
router.get('/therapist/:therapistId/info', async (req, res) => {
  try {
    const { therapistId } = req.params;

    const therapist = await getTherapistInfo(therapistId);

    res.json({ therapist });
  } catch (error) {
    logger.error('Therapist info fetch error:', error.message);
    res.status(404).json({ error: error.message });
  }
});

// GET /api/users/patient/:patientId/therapists
router.get('/patient/:patientId/therapists', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Only patient themselves or admin can view this
    if (req.user.role !== 'admin' && req.user.id !== parseInt(patientId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const therapists = await getPatientAssignedTherapists(patientId);

    res.json({ therapists });
  } catch (error) {
    logger.error('Patient therapists fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/users/:userId/deactivate
router.post('/:userId/deactivate', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    await deactivateUser(userId);

    logger.info(`Admin ${req.user.id} deactivated user ${userId}`);

    res.json({ message: 'User deactivated' });
  } catch (error) {
    logger.error('User deactivation error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users (Admin only)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { role, limit, offset } = req.query;

    const users = await getAllUsers(role, parseInt(limit) || 50, parseInt(offset) || 0);

    res.json({ users });
  } catch (error) {
    logger.error('Users list fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/users/search
router.get('/search', verifyToken, requireRole('therapist', 'admin'), async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = await searchUsers(q, parseInt(limit) || 20);

    res.json({ results });
  } catch (error) {
    logger.error('User search error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
