import { Router } from 'express';
import { addClient, removeClient } from '../events.js';

const router = Router();

router.get('/', (req, res) => {
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  const connId = addClient(userId, res);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(connId);
  });
});

export default router;
