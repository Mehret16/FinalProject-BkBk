import { pool } from '../config/database.js';
import { getGeminiResponse, classifyRiskLevel, detectLanguage, classifyIntent } from '../config/gemini.js';
import { logger } from '../config/logger.js';

/**
 * Process user message through Gemini AI and save response
 * Handles language detection, risk classification, and escalation
 */
export async function processMessageWithGemini(sessionId, userMessage, conversationHistory = []) {
  const connection = await pool.getConnection();

  try {
    // Get Gemini response with classification
    const geminiResponse = await getGeminiResponse(userMessage, conversationHistory);

    // Save bot response to database
    const [result] = await connection.execute(
      `INSERT INTO chat_messages (session_id, sender_type, message_text, language, 
                                  sentiment_score, emotion_label)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        'therapist',
        geminiResponse.message,
        geminiResponse.language,
        mapRiskToScore(geminiResponse.riskLevel),
        geminiResponse.riskLevel
      ]
    );

    // Update session with latest classification
    const sessionUpdateValues = {
      language: geminiResponse.language,
      detected_sentiment: mapRiskToSentiment(geminiResponse.riskLevel),
      distress_level: mapRiskToDistressLevel(geminiResponse.riskLevel)
    };

    // If high risk, mark for escalation
    if (geminiResponse.riskLevel === 'HIGH') {
      sessionUpdateValues.is_escalated = true;
      sessionUpdateValues.escalated_at = new Date();
      sessionUpdateValues.escalation_reason = 'High-risk keywords detected by Gemini AI';

      logger.warn(`HIGH RISK SESSION DETECTED: ${sessionId}`);
    }

    // Update session
    let updateQuery = 'UPDATE chat_sessions SET ';
    const updateValues = [];
    const updateFields = [];

    for (const [key, value] of Object.entries(sessionUpdateValues)) {
      updateFields.push(`${key} = ?`);
      updateValues.push(value);
    }

    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    updateValues.push(sessionId);

    await connection.execute(updateQuery, updateValues);

    // Save classification metadata
    await connection.execute(
      `INSERT INTO message_classifications (message_id, risk_level, intent, language, 
                                            detected_keywords, confidence_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        geminiResponse.riskLevel,
        geminiResponse.intent,
        geminiResponse.language,
        JSON.stringify(extractKeywords(userMessage, geminiResponse.riskLevel)),
        0.95
      ]
    );

    logger.info(
      `Message processed - Session: ${sessionId}, Risk: ${geminiResponse.riskLevel}, Intent: ${geminiResponse.intent}`
    );

    return {
      messageId: result.insertId,
      sessionId,
      response: geminiResponse.message,
      classification: geminiResponse.classification,
      shouldEscalate: geminiResponse.riskLevel === 'HIGH'
    };
  } catch (error) {
    logger.error('Gemini message processing error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get conversation context for Gemini (last N messages)
 */
export async function getConversationContext(sessionId, limit = 10) {
  const connection = await pool.getConnection();

  try {
    const [messages] = await connection.execute(
      `SELECT id, sender_type, message_text, language, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [sessionId, limit]
    );

    return messages.reverse(); // Return in chronological order
  } finally {
    connection.release();
  }
}

/**
 * Analyze session for crisis intervention
 */
export async function analyzeCrisisRisk(sessionId) {
  const connection = await pool.getConnection();

  try {
    const [messages] = await connection.execute(
      `SELECT message_text, emotion_label, created_at
       FROM chat_messages
       WHERE session_id = ? AND sender_type = 'patient'
       ORDER BY created_at DESC
       LIMIT 5`,
      [sessionId]
    );

    let riskScore = 0;
    let crisisIndicators = [];

    for (const msg of messages) {
      const riskLevel = classifyRiskLevel(msg.message_text);
      
      if (riskLevel === 'HIGH') {
        riskScore += 40;
        crisisIndicators.push('High-risk keywords detected');
      } else if (riskLevel === 'MEDIUM') {
        riskScore += 20;
        crisisIndicators.push('Medium-risk keywords detected');
      }
    }

    const riskPercentage = Math.min(100, riskScore);

    return {
      sessionId,
      riskPercentage,
      riskLevel: riskPercentage >= 70 ? 'HIGH' : riskPercentage >= 40 ? 'MEDIUM' : 'LOW',
      crisisIndicators,
      requiresTherapistAlert: riskPercentage >= 70,
      analyzedMessages: messages.length
    };
  } finally {
    connection.release();
  }
}

/**
 * Get analytics for therapist review
 */
export async function getSessionAnalytics(sessionId) {
  const connection = await pool.getConnection();

  try {
    // Get session info
    const [sessionData] = await connection.execute(
      `SELECT id, patient_id, language, detected_sentiment, distress_level, 
              is_escalated, created_at, updated_at
       FROM chat_sessions
       WHERE id = ?`,
      [sessionId]
    );

    if (sessionData.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionData[0];

    // Get message count
    const [messageCount] = await connection.execute(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN sender_type = 'patient' THEN 1 ELSE 0 END) as patient_messages,
              SUM(CASE WHEN sender_type = 'therapist' THEN 1 ELSE 0 END) as bot_messages
       FROM chat_messages
       WHERE session_id = ?`,
      [sessionId]
    );

    // Get classifications
    const [classifications] = await connection.execute(
      `SELECT risk_level, intent, COUNT(*) as count
       FROM message_classifications
       WHERE message_id IN (
         SELECT id FROM chat_messages WHERE session_id = ?
       )
       GROUP BY risk_level, intent`,
      [sessionId]
    );

    return {
      session,
      messageStats: messageCount[0],
      classifications,
      sessionDuration: calculateDuration(session.created_at, session.updated_at),
      requiresTherapistIntervention: session.is_escalated
    };
  } finally {
    connection.release();
  }
}

// Helper functions
function mapRiskToScore(riskLevel) {
  const mapping = {
    'LOW': 0.3,
    'MEDIUM': 0.6,
    'HIGH': 0.9
  };
  return mapping[riskLevel] || 0.3;
}

function mapRiskToSentiment(riskLevel) {
  const mapping = {
    'LOW': 'positive',
    'MEDIUM': 'mixed',
    'HIGH': 'negative'
  };
  return mapping[riskLevel] || 'neutral';
}

function mapRiskToDistressLevel(riskLevel) {
  const mapping = {
    'LOW': 1,
    'MEDIUM': 3,
    'HIGH': 5
  };
  return mapping[riskLevel] || 1;
}

function extractKeywords(message, riskLevel) {
  const keywords = [];
  const distressKeywords = [
    'suicide', 'hurt', 'pain', 'death', 'hopeless', 'depressed',
    'anxious', 'panic', 'afraid', 'terrified', 'desperate',
    'overwhelmed', 'alone', 'worthless', 'useless'
  ];

  const lowerMessage = message.toLowerCase();
  for (const keyword of distressKeywords) {
    if (lowerMessage.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  const durationMinutes = Math.floor(durationMs / 60000);
  
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`;
  }
  
  const durationHours = Math.floor(durationMinutes / 60);
  return `${durationHours}h ${durationMinutes % 60}m`;
}
