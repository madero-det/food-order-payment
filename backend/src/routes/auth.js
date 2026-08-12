import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, profile_image FROM persons WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const person = result.rows[0];

    if (!person.password_hash) {
      return res.status(401).json({ error: 'Password not set. Please contact admin.' });
    }

    const valid = await bcrypt.compare(password, person.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: person.id, name: person.name, email: person.email, role: person.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: person.id, name: person.name, email: person.email, role: person.role, profile_image: person.profile_image || null },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE persons SET password_hash = $1, role = COALESCE($2, role) WHERE LOWER(email) = LOWER($3) RETURNING id, name, email, role',
      [hash, role || null, email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json({ message: 'Password set successfully', user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const result = await pool.query('SELECT password_hash FROM persons WHERE id = $1', [decoded.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE persons SET password_hash = $1 WHERE id = $2', [hash, decoded.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { person_id, new_password } = req.body;
    if (!person_id || !new_password) {
      return res.status(400).json({ error: 'Person ID and new password are required' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    const result = await pool.query(
      'UPDATE persons SET password_hash = $1 WHERE id = $2 RETURNING id, name',
      [hash, person_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json({ message: `Password updated for ${result.rows[0].name}` });
  } catch (err) {
    next(err);
  }
});

export default router;
