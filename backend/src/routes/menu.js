import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, price, type, is_rice FROM menu_items ORDER BY type, name ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { name, price, type, is_rice } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const result = await pool.query(
      'INSERT INTO menu_items (name, price, type, is_rice) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), Number(price), type || 'food', is_rice || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Item already exists' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    const { name, price, type, is_rice } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const result = await pool.query(
      'UPDATE menu_items SET name = $1, price = $2, type = $3, is_rice = $4 WHERE id = $5 RETURNING *',
      [name.trim(), Number(price), type || 'food', is_rice || false, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Name already exists' });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted', id: Number(id) });
  } catch (err) {
    next(err);
  }
});

export default router;