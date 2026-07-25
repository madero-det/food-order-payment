import dotenv from 'dotenv';
import { broadcast } from './events.js';
import { khmNow } from './khm-datetime.js';

dotenv.config();

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

export const sendPaymentNotification = async ({ personName, price, paidAmount, orderDate, transactionDate, orderId, paymentStatus }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'YOUR_BOT_TOKEN_HERE' || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  const formatDate = (dt) => {
    if (!dt) return '-';
    const s = String(dt).replace(' ', 'T');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : dt;
  };

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    const s = String(dt).replace(' ', 'T');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return dt;
    const h = Number(m[4]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${m[1]}-${m[2]}-${m[3]} ${h12}:${m[5]} ${ampm}`;
  };

  const statusEmoji = paymentStatus === 'pending' ? '⏳' : '✅';
  const statusText = paymentStatus === 'pending' ? 'PENDING APPROVAL' : 'APPROVED';

  const message = [
    `${statusEmoji} *Payment ${statusText}*`,
    '',
    `👤 *Person:* ${personName}`,
    `💰 *Amount:* ${Number(paidAmount).toLocaleString()} R`,
    `🍽️ *Order Date:* ${formatDate(orderDate)}`,
    `📅 *Transaction Date:* ${formatDateTime(transactionDate)}`,
  ].join('\n');

  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
  };

  if (paymentStatus === 'pending') {
    payload.reply_markup = {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${orderId}` },
          { text: '❌ Reject', callback_data: `reject:${orderId}` },
        ],
      ],
    };
  }

  try {
    const url = `${TELEGRAM_API}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Telegram send failed:', await res.text());
      return null;
    }
    const result = await res.json();
    return { chatId: result.result.chat.id, messageId: result.result.message_id };
  } catch (err) {
    console.error('Telegram error:', err.message);
    return null;
  }
};

export const answerCallbackQuery = async (callbackQueryId, text) => {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true }),
    });
  } catch (err) {
    console.error('Telegram answerCallbackQuery error:', err.message);
  }
};

export const editMessageText = async (chatId, messageId, text, extra = {}) => {
  try {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', ...extra }),
    });
  } catch (err) {
    console.error('Telegram editMessageText error:', err.message);
  }
};

export const sendDeletionNotification = async ({ orderId, personName, price, orderDate, requestedBy }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'YOUR_BOT_TOKEN_HERE' || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  const formatDate = (dt) => {
    if (!dt) return '-';
    const s = String(dt).replace(' ', 'T');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : dt;
  };

  const message = [
    '🗑️ *DELETE REQUEST*',
    '',
    `👤 *Person:* ${personName}`,
    `💰 *Amount:* ${Number(price).toLocaleString()} R`,
    `🍽️ *Order Date:* ${formatDate(orderDate)}`,
    `📝 *Requested by:* ${requestedBy}`,
  ].join('\n');

  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve Delete', callback_data: `delete_approve:${orderId}` },
          { text: '❌ Cancel', callback_data: `delete_reject:${orderId}` },
        ],
      ],
    },
  };

  try {
    const url = `${TELEGRAM_API}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Telegram send failed:', await res.text());
      return null;
    }
    const result = await res.json();
    return { chatId: result.result.chat.id, messageId: result.result.message_id };
  } catch (err) {
    console.error('Telegram error:', err.message);
    return null;
  }
};

let pollingOffset = 0;

export const startTelegramPolling = (pool) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'YOUR_BOT_TOKEN_HERE') return;

  const poll = async () => {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${pollingOffset}&timeout=10`);
      const data = await res.json();
      if (data.ok && data.result) {
        for (const update of data.result) {
          pollingOffset = update.update_id + 1;
          if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, pool);
          }
        }
      }
    } catch (err) {
      console.error('Telegram polling error:', err.message);
    }
    setTimeout(poll, 1000);
  };

  console.log('Starting Telegram polling for payment approvals...');
  poll();
};

const handleCallbackQuery = async (query, pool) => {
  const { id, data, message } = query;
  const [action, orderId] = (data || '').split(':');

  if (!orderId) {
    await answerCallbackQuery(id, 'Invalid action');
    return;
  }

  try {
    if (action === 'approve') {
      await pool.query(
        `UPDATE food_orders SET payment_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );
      const result = await pool.query(
        `SELECT fo.*, p.name as person_name FROM food_orders fo JOIN persons p ON fo.person_id = p.id WHERE fo.id = $1`,
        [orderId]
      );
      const order = result.rows[0];
      const newText = [
        '✅ *Payment APPROVED*',
        '',
        `👤 *Person:* ${order.person_name}`,
        `💰 *Amount:* ${Number(order.paid_amount).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        `📅 *Transaction Date:* ${order.transaction_date}`,
        '',
        `_Approved at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Payment for ${order.person_name} approved!`);

      broadcast('payment_approved', {
        ...order,
        triggeredBy: 'telegram',
      });
    } else if (action === 'reject') {
      await pool.query(
        `UPDATE food_orders SET paid_amount = NULL, transaction_date = NULL, payment_status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );
      const result = await pool.query(
        `SELECT fo.*, p.name as person_name FROM food_orders fo JOIN persons p ON fo.person_id = p.id WHERE fo.id = $1`,
        [orderId]
      );
      const order = result.rows[0];
      const newText = [
        '❌ *Payment REJECTED*',
        '',
        `👤 *Person:* ${order.person_name}`,
        `💰 *Amount:* ${Number(order.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        '',
        `_Rejected at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Payment for ${order.person_name} rejected!`);

      broadcast('payment_rejected', {
        ...order,
        triggeredBy: 'telegram',
      });
    } else if (action === 'delete_approve') {
      const result = await pool.query(
        `SELECT fo.*, p.name as person_name FROM food_orders fo JOIN persons p ON fo.person_id = p.id WHERE fo.id = $1`,
        [orderId]
      );
      if (result.rows.length === 0) {
        await answerCallbackQuery(id, 'Order not found');
        return;
      }
      const order = result.rows[0];
      await pool.query('DELETE FROM food_orders WHERE id = $1', [orderId]);
      const newText = [
        '🗑️ *Order DELETED*',
        '',
        `👤 *Person:* ${order.person_name}`,
        `💰 *Amount:* ${Number(order.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        '',
        `_Deleted at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Order for ${order.person_name} deleted!`);

      broadcast('order_deleted', {
        id: order.id,
        triggeredBy: 'telegram',
      });
    } else if (action === 'delete_reject') {
      await pool.query(
        `UPDATE food_orders SET deletion_status = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );
      const result = await pool.query(
        `SELECT fo.*, p.name as person_name FROM food_orders fo JOIN persons p ON fo.person_id = p.id WHERE fo.id = $1`,
        [orderId]
      );
      const order = result.rows[0];
      const newText = [
        '🚫 *Delete REQUEST CANCELLED*',
        '',
        `👤 *Person:* ${order.person_name}`,
        `💰 *Amount:* ${Number(order.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        '',
        `_Cancelled at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Delete request for ${order.person_name} cancelled!`);

      broadcast('deletion_cancelled', {
        ...order,
        triggeredBy: 'telegram',
      });
    }
  } catch (err) {
    console.error('Handle callback error:', err);
    await answerCallbackQuery(id, 'Error processing request');
  }
};
