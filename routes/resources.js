import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// GET /api/resources (public)
router.get('/', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { category, language, limit, offset } = req.query;

    let query = `SELECT id, title_en, title_am, description_en, description_am,
                        category, language, resource_type, created_at
                 FROM mental_health_resources
                 WHERE is_published = TRUE`;

    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (language && language !== 'both') {
      query += ` AND (language = ? OR language = 'both')`;
      params.push(language);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const [resources] = await connection.execute(query, params);

    res.json({ resources });
  } catch (error) {
    logger.error('Resources fetch error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/resources/categories
router.get('/categories', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [categories] = await connection.execute(
      `SELECT DISTINCT category FROM mental_health_resources
       WHERE is_published = TRUE
       ORDER BY category`
    );

    res.json({
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    logger.error('Categories fetch error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/resources/:resourceId
router.get('/:resourceId', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { resourceId } = req.params;

    const [resources] = await connection.execute(
      `SELECT * FROM mental_health_resources
       WHERE id = ? AND is_published = TRUE`,
      [resourceId]
    );

    if (resources.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ resource: resources[0] });
  } catch (error) {
    logger.error('Resource fetch error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/resources (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { title_en, title_am, description_en, description_am, category, language, contentUrl, resourceType } = req.body;

    if (!title_en || !description_en || !category) {
      return res.status(400).json({ error: 'title_en, description_en, and category required' });
    }

    const [result] = await connection.execute(
      `INSERT INTO mental_health_resources
       (title_en, title_am, description_en, description_am, category, language, content_url, resource_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title_en, title_am || null, description_en, description_am || null, category, language || 'both', contentUrl || null, resourceType || 'article', req.user.id]
    );

    logger.info(`Resource created by admin ${req.user.id}`);

    res.status(201).json({
      message: 'Resource created',
      resourceId: result.insertId
    });
  } catch (error) {
    logger.error('Resource creation error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/resources/:resourceId (admin only)
router.put('/:resourceId', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { resourceId } = req.params;
    const { title_en, title_am, description_en, description_am, category, language, contentUrl, resourceType, isPublished } = req.body;

    const updates = [];
    const params = [];

    if (title_en) {
      updates.push('title_en = ?');
      params.push(title_en);
    }

    if (title_am) {
      updates.push('title_am = ?');
      params.push(title_am);
    }

    if (description_en) {
      updates.push('description_en = ?');
      params.push(description_en);
    }

    if (description_am) {
      updates.push('description_am = ?');
      params.push(description_am);
    }

    if (category) {
      updates.push('category = ?');
      params.push(category);
    }

    if (language) {
      updates.push('language = ?');
      params.push(language);
    }

    if (contentUrl) {
      updates.push('content_url = ?');
      params.push(contentUrl);
    }

    if (resourceType) {
      updates.push('resource_type = ?');
      params.push(resourceType);
    }

    if (isPublished !== undefined) {
      updates.push('is_published = ?');
      params.push(isPublished ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(resourceId);

    const query = `UPDATE mental_health_resources SET ${updates.join(', ')} WHERE id = ?`;
    await connection.execute(query, params);

    logger.info(`Resource ${resourceId} updated by admin ${req.user.id}`);

    res.json({ message: 'Resource updated' });
  } catch (error) {
    logger.error('Resource update error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/resources/:resourceId (admin only)
router.delete('/:resourceId', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { resourceId } = req.params;

    await connection.execute(
      'DELETE FROM mental_health_resources WHERE id = ?',
      [resourceId]
    );

    logger.info(`Resource ${resourceId} deleted by admin ${req.user.id}`);

    res.json({ message: 'Resource deleted' });
  } catch (error) {
    logger.error('Resource deletion error:', error.message);
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
