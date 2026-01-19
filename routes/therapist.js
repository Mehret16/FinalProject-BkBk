import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// GET /api/therapist/dashboard
router.get('/dashboard', verifyToken, requireRole('therapist'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Get assigned patients
    const [patients] = await connection.execute(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email,
              ta.assignment_date, ta.status,
              (SELECT COUNT(*) FROM chat_sessions WHERE patient_id = u.id) as session_count
       FROM therapist_assignments ta
       JOIN users u ON ta.patient_id = u.id
       WHERE ta.therapist_id = ? AND ta.status = 'active'
       ORDER BY ta.assignment_date DESC`,
      [req.user.id]
    );

    // Get pending referrals
    const [referrals] = await connection.execute(
      `SELECT r.id, r.patient_id, r.reason, r.urgency, r.status,
              r.created_at, u.first_name, u.last_name
       FROM referrals r
       JOIN users u ON r.patient_id = u.id
       WHERE r.referred_to_therapist_id = ? AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    // Get recent conversations
    const [conversations] = await connection.execute(
      `SELECT cm.id, cm.session_id, cm.message_text, cm.sentiment_score,
              cm.created_at, u.first_name, u.last_name,
              cs.patient_id, cs.is_escalated
       FROM chat_messages cm
       JOIN chat_sessions cs ON cm.session_id = cs.id
       JOIN users u ON cs.patient_id = u.id
       WHERE cs.patient_id IN (
         SELECT patient_id FROM therapist_assignments 
         WHERE therapist_id = ? AND status = 'active'
       )
       ORDER BY cm.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({
      therapistId: req.user.id,
      patientsCount: patients.length,
      pendingReferrals: referrals.length,
      recentConversationsCount: conversations.length,
      patients,
      referrals,
      recentConversations: conversations
    });
  } catch (error) {
    logger.error('Therapist dashboard error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/therapist/patients
router.get('/patients', verifyToken, requireRole('therapist'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [patients] = await connection.execute(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email,
              u.phone_number, u.date_of_birth, u.gender,
              ta.assignment_date, ta.status,
              (SELECT COUNT(*) FROM chat_sessions WHERE patient_id = u.id) as session_count,
              (SELECT MAX(created_at) FROM chat_sessions WHERE patient_id = u.id) as last_session
       FROM therapist_assignments ta
       JOIN users u ON ta.patient_id = u.id
       WHERE ta.therapist_id = ? AND ta.status = 'active'
       ORDER BY ta.assignment_date DESC`,
      [req.user.id]
    );

    res.json({ patients });
  } catch (error) {
    logger.error('Therapist patients fetch error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/therapist/patient/:patientId/report
router.get('/patient/:patientId/report', verifyToken, requireRole('therapist'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { patientId } = req.params;

    // Verify therapist has access to this patient
    const [access] = await connection.execute(
      'SELECT id FROM therapist_assignments WHERE therapist_id = ? AND patient_id = ? AND status = ?',
      [req.user.id, patientId, 'active']
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'No access to this patient' });
    }

    // Get patient info
    const [patients] = await connection.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id = ?',
      [patientId]
    );

    // Get session statistics
    const [stats] = await connection.execute(
      `SELECT COUNT(*) as total_sessions,
              AVG(distress_level) as avg_distress,
              MAX(created_at) as last_session
       FROM chat_sessions
       WHERE patient_id = ?`,
      [patientId]
    );

    // Get sentiment trend
    const [sentiments] = await connection.execute(
      `SELECT detected_sentiment, COUNT(*) as count
       FROM chat_sessions
       WHERE patient_id = ?
       GROUP BY detected_sentiment`,
      [patientId]
    );

    // Get distress keywords
    const [messages] = await connection.execute(
      `SELECT distress_keywords FROM chat_messages
       WHERE session_id IN (SELECT id FROM chat_sessions WHERE patient_id = ?)
       AND distress_keywords IS NOT NULL`,
      [patientId]
    );

    res.json({
      patient: patients[0],
      statistics: stats[0],
      sentimentTrend: sentiments,
      distressKeywordsSamples: messages.slice(0, 10)
    });
  } catch (error) {
    logger.error('Patient report error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/therapist/patient/:patientId/conversations
router.get('/patient/:patientId/conversations', verifyToken, requireRole('therapist'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { patientId } = req.params;

    // Verify access
    const [access] = await connection.execute(
      'SELECT id FROM therapist_assignments WHERE therapist_id = ? AND patient_id = ? AND status = ?',
      [req.user.id, patientId, 'active']
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'No access to this patient' });
    }

    // Get all chat sessions
    const [sessions] = await connection.execute(
      `SELECT id, session_token, language, detected_sentiment, distress_level,
              is_escalated, is_closed, created_at
       FROM chat_sessions
       WHERE patient_id = ?
       ORDER BY created_at DESC`,
      [patientId]
    );

    // Get messages for each session
    for (const session of sessions) {
      const [messages] = await connection.execute(
        `SELECT id, sender_type, message_text, sentiment_score, emotion_label, created_at
         FROM chat_messages
         WHERE session_id = ?
         ORDER BY created_at ASC`,
        [session.id]
      );
      session.messages = messages;
    }

    res.json({ sessions });
  } catch (error) {
    logger.error('Patient conversations error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
