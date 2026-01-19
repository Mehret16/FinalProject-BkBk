import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function createChatSession(patientId, language = 'en') {
  const connection = await pool.getConnection();

  try {
    const sessionToken = uuidv4();

    const [result] = await connection.execute(
      `INSERT INTO chat_sessions (patient_id, session_token, language)
       VALUES (?, ?, ?)`,
      [patientId, sessionToken, language]
    );

    logger.info(`Chat session created: ${result.insertId} for patient: ${patientId}`);

    return {
      sessionId: result.insertId,
      sessionToken,
      patientId,
      language
    };
  } finally {
    connection.release();
  }
}

export async function sendMessage(sessionId, senderType, messageText, language = 'en') {
  const connection = await pool.getConnection();

  try {
    // Save message
    const [result] = await connection.execute(
      `INSERT INTO chat_messages (session_id, sender_type, message_text, language)
       VALUES (?, ?, ?, ?)`,
      [sessionId, senderType, messageText, language]
    );

    // Check for distress keywords and update session
    const distressKeywords = detectDistressKeywords(messageText);
    const sentimentScore = analyzeSentiment(messageText);

    if (distressKeywords.length > 0 || sentimentScore < -0.5) {
      await connection.execute(
        `UPDATE chat_sessions 
         SET distress_level = ?, 
             detected_sentiment = ?
         WHERE id = ?`,
        [Math.min(distressKeywords.length, 5), 'negative', sessionId]
      );
    }

    logger.info(`Message sent in session ${sessionId}: ${senderType}`);

    return {
      messageId: result.insertId,
      sessionId,
      senderType,
      sentimentScore,
      distressKeywords
    };
  } finally {
    connection.release();
  }
}

export async function getChatHistory(sessionId, limit = 50) {
  const connection = await pool.getConnection();

  try {
    const [messages] = await connection.execute(
      `SELECT id, session_id, sender_type, message_text, language,
              sentiment_score, emotion_label, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [sessionId, limit]
    );

    return messages.reverse();
  } finally {
    connection.release();
  }
}

export async function getPatientSessions(patientId, limit = 20) {
  const connection = await pool.getConnection();

  try {
    const [sessions] = await connection.execute(
      `SELECT id, patient_id, session_token, language, detected_sentiment,
              distress_level, is_escalated, is_closed, created_at, updated_at
       FROM chat_sessions
       WHERE patient_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [patientId, limit]
    );

    return sessions;
  } finally {
    connection.release();
  }
}

export async function escalateSession(sessionId, reason) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `UPDATE chat_sessions
       SET is_escalated = TRUE, escalation_reason = ?, escalated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, sessionId]
    );

    logger.info(`Session escalated: ${sessionId} - Reason: ${reason}`);

    // Get session details
    const [sessions] = await connection.execute(
      'SELECT patient_id FROM chat_sessions WHERE id = ?',
      [sessionId]
    );

    return {
      sessionId,
      escalated: true,
      patientId: sessions[0].patient_id
    };
  } finally {
    connection.release();
  }
}

export async function closeSession(sessionId) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `UPDATE chat_sessions
       SET is_closed = TRUE, closed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId]
    );

    logger.info(`Chat session closed: ${sessionId}`);
    return { success: true };
  } finally {
    connection.release();
  }
}

export async function getSessionDetails(sessionId) {
  const connection = await pool.getConnection();

  try {
    const [sessions] = await connection.execute(
      `SELECT cs.id, cs.patient_id, cs.language, cs.detected_sentiment,
              cs.distress_level, cs.is_escalated, cs.is_closed,
              cs.created_at, cs.updated_at,
              COUNT(cm.id) as message_count
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cs.id = cm.session_id
       WHERE cs.id = ?
       GROUP BY cs.id`,
      [sessionId]
    );

    if (sessions.length === 0) {
      throw new Error('Session not found');
    }

    return sessions[0];
  } finally {
    connection.release();
  }
}

// NLP Helper functions
function detectDistressKeywords(messageText) {
  const keywords = [
    'suicide', 'hurt', 'pain', 'death', 'hopeless', 'depressed',
    'anxious', 'panic', 'afraid', 'terrified', 'desperate',
    'overwhelmed', 'alone', 'worthless', 'useless'
  ];

  const found = [];
  const lowerText = messageText.toLowerCase();

  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      found.push(keyword);
    }
  }

  return found;
}

function analyzeSentiment(messageText) {
  // Simple sentiment analysis (0-1 scale)
  // -1 = very negative, 0 = neutral, 1 = very positive
  
  const positiveWords = ['good', 'great', 'happy', 'glad', 'better', 'improve', 'hope', 'positive'];
  const negativeWords = ['bad', 'sad', 'angry', 'hate', 'terrible', 'awful', 'worst', 'horrible'];

  const lowerText = messageText.toLowerCase();
  let score = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) score += 0.1;
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) score -= 0.2;
  }

  return Math.max(-1, Math.min(1, score));
}
