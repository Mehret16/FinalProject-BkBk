import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// GET /api/admin/dashboard
router.get('/dashboard', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Total users by role
    const [userStats] = await connection.execute(
      `SELECT r.name as role, COUNT(u.id) as count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.is_active = TRUE
       GROUP BY r.name`
    );

    // Total chat sessions
    const [sessionStats] = await connection.execute(
      'SELECT COUNT(*) as total, SUM(is_escalated) as escalated FROM chat_sessions'
    );

    // Sentiment distribution
    const [sentiments] = await connection.execute(
      'SELECT detected_sentiment, COUNT(*) as count FROM chat_sessions GROUP BY detected_sentiment'
    );

    // Recent referrals
    const [referrals] = await connection.execute(
      `SELECT r.id, r.patient_id, r.referred_to_therapist_id, r.status, r.created_at,
              p.first_name as patient_name, t.first_name as therapist_name
       FROM referrals r
       JOIN users p ON r.patient_id = p.id
       LEFT JOIN users t ON r.referred_to_therapist_id = t.id
       ORDER BY r.created_at DESC
       LIMIT 10`
    );

    res.json({
      userStats,
      sessionStats: sessionStats[0],
      sentimentDistribution: sentiments,
      recentReferrals: referrals
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/admin/users
router.get('/users', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { role, status, limit, offset } = req.query;

    let query = `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                        u.is_active, u.created_at, r.name as role
                 FROM users u
                 JOIN roles r ON u.role_id = r.id`;

    const params = [];
    const conditions = [];

    if (role) {
      conditions.push('r.name = ?');
      params.push(role);
    }

    if (status === 'active') {
      conditions.push('u.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('u.is_active = FALSE');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const [users] = await connection.execute(query, params);

    res.json({ users });
  } catch (error) {
    logger.error('Users list error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/admin/analytics/sentiment
router.get('/analytics/sentiment', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [data] = await connection.execute(
      `SELECT DATE(created_at) as date, detected_sentiment, COUNT(*) as count
       FROM chat_sessions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at), detected_sentiment
       ORDER BY date DESC`
    );

    res.json({ sentimentTrend: data });
  } catch (error) {
    logger.error('Sentiment analytics error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/admin/analytics/usage
router.get('/analytics/usage', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [data] = await connection.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as session_count,
              SUM(CASE WHEN is_escalated = TRUE THEN 1 ELSE 0 END) as escalated_count
       FROM chat_sessions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    res.json({ usageData: data });
  } catch (error) {
    logger.error('Usage analytics error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/admin/referrals
router.get('/referrals', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { status, limit, offset } = req.query;

    let query = `SELECT r.id, r.patient_id, r.referred_to_therapist_id,
                        r.reason, r.urgency, r.status, r.created_at,
                        p.first_name as patient_name, p.email as patient_email,
                        t.first_name as therapist_name, t.email as therapist_email
                 FROM referrals r
                 JOIN users p ON r.patient_id = p.id
                 LEFT JOIN users t ON r.referred_to_therapist_id = t.id`;

    const params = [];

    if (status) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const [referrals] = await connection.execute(query, params);

    res.json({ referrals });
  } catch (error) {
    logger.error('Referrals list error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { action, limit, offset } = req.query;

    let query = `SELECT al.id, al.user_id, al.action, al.resource_type,
                        al.resource_id, al.status, al.created_at,
                        u.username
                 FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id`;

    const params = [];

    if (action) {
      query += ' WHERE al.action = ?';
      params.push(action);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const [logs] = await connection.execute(query, params);

    res.json({ auditLogs: logs });
  } catch (error) {
    logger.error('Audit logs error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/admin/assign-therapist
router.post('/assign-therapist', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { therapistId, patientId, referralId } = req.body;

    if (!therapistId || !patientId) {
      return res.status(400).json({ error: 'therapistId and patientId required' });
    }

    // Check if assignment already exists
    const [existing] = await connection.execute(
      'SELECT id FROM therapist_assignments WHERE therapist_id = ? AND patient_id = ?',
      [therapistId, patientId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Assignment already exists' });
    }

    const [result] = await connection.execute(
      `INSERT INTO therapist_assignments (therapist_id, patient_id, referral_id, status)
       VALUES (?, ?, ?, ?)`,
      [therapistId, patientId, referralId || null, 'active']
    );

    logger.info(`Admin assigned therapist ${therapistId} to patient ${patientId}`);

    res.json({
      message: 'Therapist assigned',
      assignmentId: result.insertId
    });
  } catch (error) {
    logger.error('Therapist assignment error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
