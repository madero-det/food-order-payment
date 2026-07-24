import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db.js';
import pool from './db.js';
import authRouter from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import personsRouter from './routes/persons.js';
import dashboardRouter from './routes/dashboard.js';
import sseRouter from './routes/sse.js';
import notificationsRouter from './routes/notifications.js';
import { authenticate } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import { startTelegramPolling } from './telegram.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/auth', authRouter);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/orders', authenticate, ordersRouter);
app.use('/api/persons', authenticate, personsRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/events', authenticate, sseRouter);
app.use('/api/notifications', authenticate, notificationsRouter);

app.use(errorHandler);

const start = async () => {
  await initDB();
  startTelegramPolling(pool);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();
