import express from 'express';
import {
  createChatSession,
  sendMessage,
  getChatHistory,
  getPatientSessions,
  escalateSession,
  closeSession,
  getSessionDetails
} from '../services/chatService.js';
import {
  processMessageWithGemini,
  getConversationContext,
  analyzeCrisisRisk,
  getSessionAnalytics
} from '../services/geminiService.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// POST /api/chat/session/create
router.post('/session/create', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const { language } = req.body;

    const session = await createChatSession(req.user.id, language || 'en');

    res.status(201).json({
      message: 'Chat session created',
      session
    });
  } catch (error) {
    logger.error('Chat session creation error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/chat/message
router.post('/message', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const { sessionId, messageText, language } = req.body;

    if (!sessionId || !messageText) {
      return res.status(400).json({ error: 'sessionId and messageText required' });
    }

    // Save patient message
    const message = await sendMessage(sessionId, 'patient', messageText, language || 'en');

    // Get conversation context for Gemini AI
    const conversationContext = await getConversationContext(sessionId, 5);

    // Get Gemini AI response and save it
    const geminiResult = await processMessageWithGemini(sessionId, messageText, conversationContext);

    // If high risk detected, prepare alert for therapist
    let alertData = null;
    if (geminiResult.shouldEscalate) {
      const crisisAnalysis = await analyzeCrisisRisk(sessionId);
      alertData = {
        type: 'CRISIS_ALERT',
        riskLevel: crisisAnalysis.riskLevel,
        indicators: crisisAnalysis.crisisIndicators
      };
      logger.warn(`Crisis Alert triggered for Session: ${sessionId}`);
    }

    res.json({
      message: 'Message processed successfully',
      patientMessage: message,
      botResponse: {
        messageId: geminiResult.messageId,
        response: geminiResult.response,
        classification: geminiResult.classification
      },
      alert: alertData
    });
  } catch (error) {
    logger.error('Message send error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit } = req.query;

    const history = await getChatHistory(sessionId, parseInt(limit) || 50);

    res.json({
      sessionId,
      messages: history
    });
  } catch (error) {
    logger.error('Chat history fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/chat/sessions
router.get('/sessions', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const { limit } = req.query;

    const sessions = await getPatientSessions(req.user.id, parseInt(limit) || 20);

    res.json({
      sessions
    });
  } catch (error) {
    logger.error('Sessions fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/chat/session/:sessionId
router.get('/session/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await getSessionDetails(sessionId);

    res.json(session);
  } catch (error) {
    logger.error('Session details fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/chat/escalate/:sessionId
router.post('/escalate/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Escalation reason required' });
    }

    const result = await escalateSession(sessionId, reason);

    logger.info(`Session escalated by user ${req.user.id}`);

    res.json({
      message: 'Session escalated',
      result
    });
  } catch (error) {
    logger.error('Session escalation error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/chat/close/:sessionId
router.post('/close/:sessionId', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await closeSession(sessionId);

    res.json({
      message: 'Chat session closed',
      result
    });
  } catch (error) {
    logger.error('Session close error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/chat/crisis-analysis/:sessionId
router.get('/crisis-analysis/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const analysis = await analyzeCrisisRisk(sessionId);

    res.json(analysis);
  } catch (error) {
    logger.error('Crisis analysis error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/chat/analytics/:sessionId
router.get('/analytics/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const analytics = await getSessionAnalytics(sessionId);

    res.json(analytics);
  } catch (error) {
    logger.error('Session analytics error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
