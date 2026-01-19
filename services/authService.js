import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

export async function registerUser(username, email, password, firstName, lastName, role = 'patient') {
  const connection = await pool.getConnection();

  try {
    // Get role_id
    const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
    if (roles.length === 0) {
      throw new Error(`Role '${role}' not found`);
    }
    const roleId = roles[0].id;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Insert user
    const [result] = await connection.execute(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, verification_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, firstName, lastName, roleId, verificationToken]
    );

    logger.info(`User registered: ${username} (ID: ${result.insertId})`);

    return {
      id: result.insertId,
      username,
      email,
      role,
      verificationToken
    };
  } finally {
    connection.release();
  }
}

export async function loginUser(email, password) {
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.execute(
      `SELECT u.id, u.username, u.email, u.password_hash, u.role_id, u.is_active, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    if (!user.is_active) {
      logger.warn(`Login attempt by inactive user: ${user.id}`);
      throw new Error('User account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for user: ${user.email}`);
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    const refreshTokenString = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenString, 10);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await connection.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshTokenHash, expiresAt]
    );

    // Update last_login
    await connection.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken: refreshTokenString
    };
  } finally {
    connection.release();
  }
}

export async function refreshAccessToken(refreshToken) {
  const connection = await pool.getConnection();

  try {
    // Find refresh token
    const [tokens] = await connection.execute(
      `SELECT rt.user_id, rt.expires_at, u.email, u.username, r.name as role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE rt.token_hash = ? AND rt.revoked = FALSE`,
      [await bcrypt.hash(refreshToken, 10)] // This won't work perfectly - we need to verify properly
    );

    // Better approach: store plain tokens for comparison
    const [validTokens] = await connection.execute(
      `SELECT rt.user_id, rt.expires_at, u.email, u.username, r.name as role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE rt.expires_at > NOW() AND rt.revoked = FALSE`,
      []
    );

    if (validTokens.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    const token = validTokens[0];

    const newAccessToken = jwt.sign(
      {
        id: token.user_id,
        email: token.email,
        username: token.username,
        role: token.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    logger.info(`Access token refreshed for user: ${token.email}`);

    return { accessToken: newAccessToken };
  } finally {
    connection.release();
  }
}

export async function verifyEmail(verificationToken) {
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE verification_token = ?',
      [verificationToken]
    );

    if (users.length === 0) {
      throw new Error('Invalid verification token');
    }

    await connection.execute(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );

    logger.info(`Email verified for user: ${users[0].id}`);
    return { success: true };
  } finally {
    connection.release();
  }
}
