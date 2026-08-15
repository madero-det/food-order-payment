import { Router } from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { deleteCacheKey, getOrSet } from '../cache.js';

const PERSONS_ADMIN_KEY = 'persons:admin';
const PERSONS_ADMIN_TTL = 300;
const PERSONS_USER_TTL = 60;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', '..', 'uploads');

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

const storageMode = process.env.AVATAR_STORAGE === 'local' ? 'local' : 'cloudinary';

const AVATAR_EXTS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const key = isAdmin ? PERSONS_ADMIN_KEY : `persons:user:${req.user.id}`;
    const ttl = isAdmin ? PERSONS_ADMIN_TTL : PERSONS_USER_TTL;
    const data = await getOrSet(key, ttl, () => {
      const query = isAdmin
        ? 'SELECT id, name, email, role, profile_image, default_price, created_at FROM persons ORDER BY name ASC'
        : 'SELECT id, name, email, role, profile_image, default_price, created_at FROM persons WHERE id = $1';
      const params = isAdmin ? [] : [req.user.id];
      return pool.query(query, params).then(r => r.rows);
    });
    res.json(data);
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
    const result = await pool.query('SELECT id, name, email, role, profile_image, default_price, created_at FROM persons WHERE id = $1', [id]);
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
    const { name, email, default_price } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const result = await pool.query(
      'INSERT INTO persons (name, email, default_price) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email.trim().toLowerCase(), default_price || null]
    );
    deleteCacheKey(PERSONS_ADMIN_KEY);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A person with this email already exists' });
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
    const { name, email, default_price } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      'UPDATE persons SET name = $1, email = COALESCE($2, email), default_price = $3 WHERE id = $4 RETURNING *',
      [name.trim(), email ? email.trim().toLowerCase() : null, default_price || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    deleteCacheKey(PERSONS_ADMIN_KEY);
    deleteCacheKey(`persons:user:${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A person with this email already exists' });
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
      const imgPath = existing.rows[0].profile_image;
      if (!imgPath.startsWith('http')) {
        const filePath = join(uploadsDir, imgPath);
        if (existsSync(filePath)) unlinkSync(filePath);
      }
    }
    deleteCacheKey(PERSONS_ADMIN_KEY);
    deleteCacheKey(`persons:user:${id}`);
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
    const oldImage = existing.rows[0]?.profile_image;

    let imageUrl;

    if (storageMode === 'local') {
      const ext = AVATAR_EXTS[req.file.mimetype] || '.jpg';
      const filename = `avatars/avatar-${id}-${Date.now()}${ext}`;
      const filePath = join(uploadsDir, filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, req.file.buffer);
      if (oldImage && !oldImage.startsWith('http')) {
        const oldPath = join(uploadsDir, oldImage);
        if (existsSync(oldPath)) unlinkSync(oldPath);
      }
      imageUrl = filename;
    } else {
      if (oldImage) {
        const publicId = oldImage.match(/\/upload\/v\d+\/(.+)\./);
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
      imageUrl = uploadResult.secure_url;
    }

    const result = await pool.query(
      'UPDATE persons SET profile_image = $1 WHERE id = $2 RETURNING id, name, email, role, profile_image, default_price',
      [imageUrl, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    deleteCacheKey(PERSONS_ADMIN_KEY);
    deleteCacheKey(`persons:user:${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
