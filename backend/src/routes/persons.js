import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', '..', 'uploads');

if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    cb(null, ext && mime);
  },
});

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? 'SELECT id, name, role, profile_image, created_at FROM persons ORDER BY name ASC'
      : 'SELECT id, name, role, profile_image, created_at FROM persons WHERE id = $1';
    const params = isAdmin ? [] : [req.user.id];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && Number(id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await pool.query('SELECT id, name, role, profile_image, created_at FROM persons WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      'INSERT INTO persons (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Person already exists' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      'UPDATE persons SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Person name already exists' });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const existing = await pool.query('SELECT profile_image FROM persons WHERE id = $1', [id]);
    const result = await pool.query('DELETE FROM persons WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    if (existing.rows[0]?.profile_image) {
      const filePath = join(uploadsDir, existing.rows[0].profile_image);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
    res.json({ message: 'Person deleted', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/avatar', upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && Number(id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Image file required (jpeg, png, gif, webp)' });
    }
    const existing = await pool.query('SELECT profile_image FROM persons WHERE id = $1', [id]);
    if (existing.rows[0]?.profile_image) {
      const oldPath = join(uploadsDir, existing.rows[0].profile_image);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
    const result = await pool.query(
      'UPDATE persons SET profile_image = $1 WHERE id = $2 RETURNING id, name, role, profile_image',
      [req.file.filename, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
