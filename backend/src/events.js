import { saveNotification } from './notifications.js';
import { clearByPrefix } from './cache.js';

const DASHBOARD_EVENTS = ['order_created', 'order_updated', 'order_deleted', 'payment_approved', 'payment_rejected', 'deletion_approved'];

const clients = new Map();
let nextId = 1;

export const addClient = (userId, res) => {
  const id = nextId++;
  clients.set(id, { userId, res });
  console.log(`SSE client connected: user=${userId} conn=${id} (total: ${clients.size})`);
  return id;
};

export const removeClient = (connId) => {
  clients.delete(connId);
  console.log(`SSE client disconnected: conn=${connId} (total: ${clients.size})`);
};

export const broadcast = (event, data) => {
  saveNotification(event, data).catch(() => {});

  if (DASHBOARD_EVENTS.includes(event)) {
    clearByPrefix('dashboard:');
    clearByPrefix('monthly:');
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  clients.forEach(({ userId, res }, connId) => {
    try {
      res.write(message);
    } catch (err) {
      console.error(`Failed to send to client user=${userId} conn=${connId}:`, err.message);
      clients.delete(connId);
    }
  });
};

export const getClientCount = () => clients.size;
