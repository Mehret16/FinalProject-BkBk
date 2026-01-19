import express from 'express';
import {
  createReferral,
  getReferralsByPatient,
  getReferralsToTherapist,
  getPatientDataByReferral,
  updateReferralStatus,
  addReferralNotes
} from '../services/referralService.js';
import { verifyToken, requireRole, verifyReferralAccess } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// POST /api/referrals/create
// Patient creates a referral to a therapist
router.post('/create', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const { therapistId, reason, urgency } = req.body;

    if (!therapistId || !reason) {
      return res.status(400).json({ error: 'therapistId and reason required' });
    }

    const referral = await createReferral(req.user.id, therapistId, reason, urgency || 'medium');

    res.status(201).json({
      message: 'Referral created and therapist notified',
      referral
    });
  } catch (error) {
    logger.error('Referral creation error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/referrals/my-referrals
// Patient gets their own referrals
router.get('/my-referrals', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const referrals = await getReferralsByPatient(req.user.id);

    res.json({
      referrals
    });
  } catch (error) {
    logger.error('Referrals fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/referrals/therapist
// Therapist gets referrals to them
router.get('/therapist', verifyToken, requireRole('therapist'), async (req, res) => {
  try {
    const referrals = await getReferralsToTherapist(req.user.id);

    res.json({
      referrals
    });
  } catch (error) {
    logger.error('Therapist referrals fetch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/referrals/access
// Therapist accesses patient data via referral token
// Query param: ?access_token=TOKEN or Header: X-Referral-Token
router.post('/access', async (req, res) => {
  try {
    const accessToken = req.query.access_token || req.headers['x-referral-token'];

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const patientData = await getPatientDataByReferral(accessToken);

    logger.info(`Therapist accessed patient data: ${patientData.patient.id}`);

    res.json({
      message: 'Patient data accessed',
      data: patientData
    });
  } catch (error) {
    logger.error('Patient data access error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// GET /api/referrals/patient/:referralId
// Therapist views full patient data with referral token
router.get('/patient/:referralId', async (req, res) => {
  try {
    const accessToken = req.query.access_token || req.headers['x-referral-token'];

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const patientData = await getPatientDataByReferral(accessToken);

    res.json(patientData);
  } catch (error) {
    logger.error('Patient profile access error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// POST /api/referrals/:referralId/status
// Update referral status (therapist accepting/rejecting)
router.post('/:referralId/status', verifyToken, requireRole('therapist'), async (req, res) => {
  try {
    const { referralId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const result = await updateReferralStatus(referralId, status);

    logger.info(`Therapist ${req.user.id} updated referral ${referralId} status to ${status}`);

    res.json({
      message: 'Referral status updated',
      result
    });
  } catch (error) {
    logger.error('Status update error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/referrals/:referralId/notes
// Add notes to referral
router.post('/:referralId/notes', verifyToken, requireRole('therapist'), async (req, res) => {
  try {
    const { referralId } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Notes required' });
    }

    const result = await addReferralNotes(referralId, notes);

    res.json({
      message: 'Notes added to referral',
      result
    });
  } catch (error) {
    logger.error('Notes add error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
