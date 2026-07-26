import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, price FROM menu_items ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { name, price } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const result = await pool.query(
      'INSERT INTO menu_items (name, price) VALUES ($1, $2) RETURNING *',
      [name.trim(), Number(price)]
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
    const { name, price } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const result = await pool.query(
      'UPDATE menu_items SET name = $1, price = $2 WHERE id = $3 RETURNING *',
      [name.trim(), Number(price), id]
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