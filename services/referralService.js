import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendEmail, generateTherapistAccessEmail } from '../config/email.js';
import { v4 as uuidv4 } from 'uuid';

export async function createReferral(patientId, referredToTherapistId, reason, urgency = 'medium') {
  const connection = await pool.getConnection();

  try {
    // Generate unique access token for therapist
    const accessToken = jwt.sign(
      {
        type: 'referral_access',
        patientId,
        therapistId: referredToTherapistId,
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const [result] = await connection.execute(
      `INSERT INTO referrals 
       (patient_id, referred_to_therapist_id, reason, urgency, access_token)
       VALUES (?, ?, ?, ?, ?)`,
      [patientId, referredToTherapistId, reason, urgency, accessToken]
    );

    const referralId = result.insertId;

    // Get therapist email
    const [therapists] = await connection.execute(
      'SELECT email, first_name FROM users WHERE id = ?',
      [referredToTherapistId]
    );

    // Get patient name
    const [patients] = await connection.execute(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [patientId]
    );

    if (therapists.length > 0 && patients.length > 0) {
      const therapist = therapists[0];
      const patient = patients[0];
      const patientName = `${patient.first_name} ${patient.last_name}`;

      // Generate access link
      const accessLink = `${process.env.FRONTEND_URL}/therapist/referral?access_token=${accessToken}&referral_id=${referralId}`;

      // Send email to therapist with full access
      const emailHtml = generateTherapistAccessEmail(therapist.email, patientName, accessLink);

      try {
        await sendEmail(
          therapist.email,
          `New Patient Referral: ${patientName}`,
          emailHtml
        );

        // Update referral with notification timestamp
        await connection.execute(
          'UPDATE referrals SET therapist_notified_at = CURRENT_TIMESTAMP WHERE id = ?',
          [referralId]
        );

        logger.info(`Referral email sent to therapist ${referredToTherapistId}`);
      } catch (emailError) {
        logger.error(`Failed to send referral email: ${emailError.message}`);
      }
    }

    logger.info(`Referral created: ${referralId} from patient ${patientId} to therapist ${referredToTherapistId}`);

    return {
      referralId,
      patientId,
      therapistId: referredToTherapistId,
      status: 'pending',
      accessToken,
      createdAt: new Date()
    };
  } finally {
    connection.release();
  }
}

export async function getReferralsByPatient(patientId) {
  const connection = await pool.getConnection();

  try {
    const [referrals] = await connection.execute(
      `SELECT r.id, r.patient_id, r.referred_to_therapist_id,
              r.referral_type, r.reason, r.urgency, r.status,
              r.therapist_notified_at, r.created_at,
              u.first_name, u.last_name, u.email
       FROM referrals r
       LEFT JOIN users u ON r.referred_to_therapist_id = u.id
       WHERE r.patient_id = ?
       ORDER BY r.created_at DESC`,
      [patientId]
    );

    return referrals;
  } finally {
    connection.release();
  }
}

export async function getReferralsToTherapist(therapistId) {
  const connection = await pool.getConnection();

  try {
    const [referrals] = await connection.execute(
      `SELECT r.id, r.patient_id, r.referred_to_therapist_id,
              r.referral_type, r.reason, r.urgency, r.status,
              r.access_token, r.access_granted_at, r.created_at,
              u.username, u.first_name, u.last_name, u.email
       FROM referrals r
       JOIN users u ON r.patient_id = u.id
       WHERE r.referred_to_therapist_id = ?
       ORDER BY r.created_at DESC`,
      [therapistId]
    );

    return referrals;
  } finally {
    connection.release();
  }
}

export async function getPatientDataByReferral(accessToken) {
  const connection = await pool.getConnection();

  try {
    // Verify the access token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }

    if (decoded.type !== 'referral_access') {
      throw new Error('Invalid access token type');
    }

    const { patientId, therapistId } = decoded;

    // Get referral info
    const [referrals] = await connection.execute(
      'SELECT * FROM referrals WHERE patient_id = ? AND referred_to_therapist_id = ?',
      [patientId, therapistId]
    );

    if (referrals.length === 0) {
      throw new Error('Referral not found');
    }

    const referral = referrals[0];

    // Update access_granted_at
    if (!referral.access_granted_at) {
      await connection.execute(
        'UPDATE referrals SET access_granted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [referral.id]
      );
    }

    // Get patient profile
    const [patients] = await connection.execute(
      `SELECT id, username, email, first_name, last_name, phone_number,
              date_of_birth, gender, language_preference, created_at
       FROM users WHERE id = ?`,
      [patientId]
    );

    // Get patient's chat sessions and messages
    const [chatSessions] = await connection.execute(
      `SELECT cs.id, cs.session_token, cs.language, cs.detected_sentiment,
              cs.distress_level, cs.is_escalated, cs.created_at
       FROM chat_sessions cs
       WHERE cs.patient_id = ?
       ORDER BY cs.created_at DESC`,
      [patientId]
    );

    // Get all messages for all sessions
    const [allMessages] = await connection.execute(
      `SELECT cm.id, cm.session_id, cm.sender_type, cm.message_text,
              cm.language, cm.sentiment_score, cm.emotion_label, cm.created_at
       FROM chat_messages cm
       WHERE cm.session_id IN (
         SELECT id FROM chat_sessions WHERE patient_id = ?
       )
       ORDER BY cm.created_at ASC`,
      [patientId]
    );

    return {
      referralId: referral.id,
      patient: patients[0],
      chatSessions,
      messages: allMessages,
      referralDetails: {
        reason: referral.reason,
        urgency: referral.urgency,
        status: referral.status,
        createdAt: referral.created_at
      }
    };
  } finally {
    connection.release();
  }
}

export async function updateReferralStatus(referralId, status) {
  const connection = await pool.getConnection();

  try {
    const validStatuses = ['pending', 'accepted', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    let completedAt = null;
    if (status === 'completed') {
      completedAt = new Date();
    }

    await connection.execute(
      `UPDATE referrals 
       SET status = ?, 
           completed_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, completedAt, referralId]
    );

    logger.info(`Referral ${referralId} status updated to: ${status}`);

    return { success: true, referralId, status };
  } finally {
    connection.release();
  }
}

export async function addReferralNotes(referralId, notes) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `UPDATE referrals SET notes = ? WHERE id = ?`,
      [notes, referralId]
    );

    logger.info(`Notes added to referral: ${referralId}`);
    return { success: true };
  } finally {
    connection.release();
  }
}
