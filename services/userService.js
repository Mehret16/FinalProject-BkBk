import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

export async function getUserById(userId) {
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.execute(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number,
              u.date_of_birth, u.gender, u.language_preference, u.is_active,
              u.is_verified, u.last_login, u.created_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return users[0];
  } finally {
    connection.release();
  }
}

export async function updateUserProfile(userId, updates) {
  const connection = await pool.getConnection();

  try {
    const allowedFields = [
      'first_name',
      'last_name',
      'phone_number',
      'date_of_birth',
      'gender',
      'language_preference'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await connection.execute(query, updateValues);

    logger.info(`User profile updated: ${userId}`);
    return await getUserById(userId);
  } finally {
    connection.release();
  }
}

export async function deactivateUser(userId) {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    logger.info(`User deactivated: ${userId}`);
    return { success: true };
  } finally {
    connection.release();
  }
}

export async function getAllUsers(role = null, limit = 50, offset = 0) {
  const connection = await pool.getConnection();

  try {
    let query = `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                        u.is_active, u.created_at, r.name as role
                 FROM users u
                 JOIN roles r ON u.role_id = r.id`;

    const params = [];

    if (role) {
      query += ' WHERE r.name = ?';
      params.push(role);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users] = await connection.execute(query, params);
    return users;
  } finally {
    connection.release();
  }
}

export async function searchUsers(searchTerm, limit = 20) {
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.execute(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              u.is_active, u.created_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
       LIMIT ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
    );

    return users;
  } finally {
    connection.release();
  }
}

export async function getTherapistInfo(therapistId) {
  const connection = await pool.getConnection();

  try {
    const [therapists] = await connection.execute(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              ts.specializations, ts.bio, ts.license_number, ts.license_expiry,
              ts.years_of_experience, ts.is_available
       FROM users u
       LEFT JOIN therapist_specializations ts ON u.id = ts.therapist_id
       WHERE u.id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'therapist')`,
      [therapistId]
    );

    if (therapists.length === 0) {
      throw new Error('Therapist not found');
    }

    return therapists[0];
  } finally {
    connection.release();
  }
}

export async function getPatientAssignedTherapists(patientId) {
  const connection = await pool.getConnection();

  try {
    const [therapists] = await connection.execute(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              ts.specializations, ts.bio, ts.years_of_experience,
              ta.assignment_date, ta.status
       FROM therapist_assignments ta
       JOIN users u ON ta.therapist_id = u.id
       LEFT JOIN therapist_specializations ts ON u.id = ts.therapist_id
       WHERE ta.patient_id = ? AND ta.status = 'active'`,
      [patientId]
    );

    return therapists;
  } finally {
    connection.release();
  }
}
