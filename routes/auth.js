import express from 'express';
import passport from 'passport';
import { 
  registerUser, 
  loginUser, 
  verifyEmail 
} from '../services/authService.js';
import { 
  googleAuth, 
  googleAuthCallback, 
  getCurrentUser, 
  logout 
} from '../controllers/authController.js';
import { validateEmail, validatePassword, validateInput } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Validate input
    const { isValid, errors } = validateInput(
      { username, email, password, firstName, lastName },
      ['username', 'email', 'password', 'firstName', 'lastName']
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
      });
    }

    const user = await registerUser(username, email, password, firstName, lastName, role || 'patient');

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { isValid, errors } = validateInput({ email, password }, ['email', 'password']);

    if (!isValid) {
      return res.status(400).json({ error: 'Email and password required', details: errors });
    }

    const result = await loginUser(email, password);

    res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { verificationToken } = req.body;

    if (!verificationToken) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const result = await verifyEmail(verificationToken);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // For now, this endpoint would need additional implementation
    // to properly verify the refresh token from the database
    res.status(501).json({ error: 'Refresh endpoint needs implementation' });
  } catch (error) {
    logger.error('Token refresh error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Google OAuth Routes
router.get('/google', googleAuth);

router.get(
  '/google/callback', 
  googleAuthCallback
);

// Get current user
router.get('/me', verifyToken, getCurrentUser);

// Logout
router.post('/logout', verifyToken, logout);

export default router;
