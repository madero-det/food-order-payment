import { Router } from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import pool from '../db.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(file.originalname.toLowerCase().split('.').pop());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    cb(null, ext && mime);
  },
});

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? 'SELECT id, name, role, profile_image, default_price, created_at FROM persons ORDER BY name ASC'
      : 'SELECT id, name, role, profile_image, default_price, created_at FROM persons WHERE id = $1';
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
    const result = await pool.query('SELECT id, name, role, profile_image, default_price, created_at FROM persons WHERE id = $1', [id]);
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
    const { name, default_price } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      'INSERT INTO persons (name, default_price) VALUES ($1, $2) RETURNING *',
      [name.trim(), default_price || null]
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
    const { name, default_price } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      'UPDATE persons SET name = $1, default_price = $2 WHERE id = $3 RETURNING *',
      [name.trim(), default_price || null, id]
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
      const publicId = existing.rows[0].profile_image.match(/\/upload\/v\d+\/(.+)\./);
      if (publicId) {
        cloudinary.v2.uploader.destroy(publicId[1]).catch(() => {});
      }
    }

    const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const uploadResult = await cloudinary.v2.uploader.upload(b64, {
      folder: 'food-order-avatars',
      public_id: `avatar-${id}-${Date.now()}`,
      width: 400,
      height: 400,
      crop: 'fill',
    });

    const result = await pool.query(
      'UPDATE persons SET profile_image = $1 WHERE id = $2 RETURNING id, name, role, profile_image, default_price',
      [uploadResult.secure_url, id]
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
