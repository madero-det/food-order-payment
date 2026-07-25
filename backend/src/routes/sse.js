import { Router } from 'express';
import { addClient, removeClient } from '../events.js';

const router = Router();

router.get('/', (req, res) => {
  const userId = req.user.id;

  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'CDN-Cache-Control': 'no-cache',
    'Cloudflare-CDN-Cache-Control': 'no-cache',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  const connId = addClient(userId, res);

  const heartbeat = setInterval(() => {
    const dt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Phnom_Penh' }).replace('T', ' ');
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ dateTime: dt.substring(0, 19) })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(connId);
  });
});

export default router;
