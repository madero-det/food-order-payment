import { Router } from 'express';
import pool from '../db.js';
import { getUnreadKey, getOrSet, deleteCacheKey } from '../cache.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM notifications WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ notifications: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const key = getUnreadKey(req.user.id);
    const data = await getOrSet(key, 15, () =>
      pool.query(
        `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false`,
        [req.user.id]
      ).then(r => r.rows[0].count)
    );
    res.json({ count: data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    deleteCacheKey(getUnreadKey(req.user.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    deleteCacheKey(getUnreadKey(req.user.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    deleteCacheKey(getUnreadKey(req.user.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
