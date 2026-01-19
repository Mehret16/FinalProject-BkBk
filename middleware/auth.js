import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} to resource requiring role: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Continue without user if token is invalid
  }
  next();
}

export function verifyReferralAccess(req, res, next) {
  try {
    const token = req.query.access_token || req.headers['x-referral-token'];
    if (!token) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'referral_access') {
      return res.status(401).json({ error: 'Invalid access token type' });
    }

    req.referralAccess = decoded;
    next();
  } catch (error) {
    logger.error('Referral access verification failed:', error.message);
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}
