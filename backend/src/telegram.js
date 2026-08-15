import dotenv from 'dotenv';
import { broadcast } from './events.js';
import { khmNow } from './khm-datetime.js';

dotenv.config();

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function fmtDate(dt) {
  if (!dt) return '-';
  return String(dt).substring(0, 10);
}

function fmtDateTime(dt) {
  if (!dt) return '-';
  const s = String(dt).replace(' ', 'T');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return dt;
  const h = Number(m[4]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${m[1]}-${m[2]}-${m[3]} ${h12}:${m[5]} ${ampm}`;
}

export const sendPaymentNotification = async ({ personName, price, paidAmount, orderDate, transactionDate, orderId, paymentStatus }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'YOUR_BOT_TOKEN_HERE' || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  const statusEmoji = paymentStatus === 'pending' ? '\u23F3' : '\u2705';
  const statusText = paymentStatus === 'pending' ? 'PENDING APPROVAL' : 'APPROVED';

  const message = [
    `${statusEmoji} *Payment ${statusText}*`,
    '',
    `\u{1F464} *Person:* ${personName}`,
    `\u{1F4B0} *Amount:* ${Number(paidAmount).toLocaleString()} R`,
    `\u{1F37D}\uFE0F *Order Date:* ${fmtDate(orderDate)}`,
    `\u{1F4C5} *Transaction Date:* ${fmtDateTime(transactionDate)}`,
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
          { text: '\u2705 Approve', callback_data: `approve:${orderId}` },
          { text: '\u274C Reject', callback_data: `reject:${orderId}` },
        ],
      ],
    };
  }

  let result = null;
  try {
    const url = `${TELEGRAM_API}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Telegram send failed:', await res.text());
    } else {
      const data = await res.json();
      result = { chatId: data.result.chat.id, messageId: data.result.message_id };
    }
  } catch (err) {
    console.error('Telegram error:', err.message);
  }

  return result;
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

export const deleteMessage = async (chatId, messageId) => {
  if (!chatId || !messageId) return;
  try {
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch (err) {
    console.error('Telegram deleteMessage error:', err.message);
  }
};

export const sendDeletionNotification = async ({ orderId, personName, price, orderDate, requestedBy }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'YOUR_BOT_TOKEN_HERE' || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  const message = [
    '\u{1F5D1}\uFE0F *DELETE REQUEST*',
    '',
    `\u{1F464} *Person:* ${personName}`,
    `\u{1F4B0} *Amount:* ${Number(price).toLocaleString()} R`,
    `\u{1F37D}\uFE0F *Order Date:* ${fmtDate(orderDate)}`,
    `\u{1F4DD} *Requested by:* ${requestedBy}`,
  ].join('\n');

  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u2705 Approve Delete', callback_data: `delete_approve:${orderId}` },
          { text: '\u274C Cancel', callback_data: `delete_reject:${orderId}` },
        ],
      ],
    },
  };

  let result = null;
  try {
    const url = `${TELEGRAM_API}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Telegram send failed:', await res.text());
    } else {
      const data = await res.json();
      result = { chatId: data.result.chat.id, messageId: data.result.message_id };
    }
  } catch (err) {
    console.error('Telegram error:', err.message);
  }

  return result;
};

function buildOrderMessage({ orderId, personName, orderDate, items, price, notes }) {
  const lines = [];
  lines.push(`\u{1F37D}\uFE0F *NEW ORDER* #${orderId}`);
  lines.push('');
  lines.push(`\u{1F464} *Customer:* ${personName}`);
  lines.push(`\u{1F4C5} *Order Date:* ${fmtDate(orderDate)}`);

  if (items && items.length) {
    lines.push('');
    lines.push('*Items:*');
    items.forEach((it, i) => {
      const qty = it.quantity || 1;
      const itemTotal = Number(it.price) * qty;
      lines.push(`${i + 1}. ${it.name} x ${qty} \u2014 ${itemTotal.toLocaleString()} R`);
    });
  }

  lines.push('');
  lines.push(`\u{1F4B0} *Total:* ${Number(price).toLocaleString()} R`);

  if (notes) {
    lines.push('');
    lines.push(`\u{1F4DD} *Notes:* ${notes}`);
  }

  return lines.join('\n');
}

export const sendOrderNotification = async (data) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ORDER_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'YOUR_BOT_TOKEN_HERE' || chatId === 'YOUR_CHAT_ID_HERE') {
    console.log('Telegram not configured, skipping order notification');
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: buildOrderMessage(data), parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      console.error('Telegram order send failed:', await res.text());
      return null;
    }
    const result = await res.json();
    return { chatId: result.result.chat.id, messageId: result.result.message_id };
  } catch (err) {
    console.error('Telegram order error:', err.message);
    return null;
  }
};

export const updateOrderNotification = async ({ chatId, messageId, ...data }) => {
  if (!chatId || !messageId) return;
  await editMessageText(chatId, messageId, buildOrderMessage(data));
};

export const sendUnpaidReminder = async (pool) => {
  try {
    const now = new Date();
    const khh = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh', hour: '2-digit', hour12: false }));
    if (khh !== 20) return;

    const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Phnom_Penh' }).split(',')[0];
    const result = await pool.query(
      `SELECT fo.id, fo.price, p.name as person_name
       FROM food_orders fo
       JOIN persons p ON fo.person_id = p.id
       WHERE fo.order_date = $1 AND fo.paid_amount IS NULL
       ORDER BY p.name`,
      [today]
    );

    if (result.rows.length === 0) return;

    const lines = result.rows.map((o, i) =>
      `  ${i + 1}. ${o.person_name} \u2014 ${Number(o.price).toLocaleString()} R`
    ).join('\n');

    const total = result.rows.reduce((s, o) => s + Number(o.price), 0);

    const msg = [
      `\u26A0\uFE0F *Unpaid Orders Today* (${today})`,
      '',
      `${result.rows.length} orders \u2014 ${total.toLocaleString()} R`,
      '',
      lines,
    ].join('\n');

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' }),
    });
  } catch (err) {
    console.error('Unpaid reminder error:', err.message);
  }
};

let pollingOffset = 0;

export const startTelegramPolling = (pool) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'YOUR_BOT_TOKEN_HERE') return;

  const pollingFlag = (process.env.TELEGRAM_POLLING || '').toLowerCase();
  if (['off', 'false', '0', 'no'].includes(pollingFlag)) {
    console.log('Telegram polling disabled (TELEGRAM_POLLING != on)');
    return;
  }

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

  console.log('Starting Telegram polling...');
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
        '\u2705 *Payment APPROVED*',
        '',
        `\u{1F464} *Person:* ${order.person_name}`,
        `\u{1F4B0} *Amount:* ${Number(order.paid_amount).toLocaleString()} R`,
        `\u{1F37D}\uFE0F *Order Date:* ${order.order_date}`,
        `\u{1F4C5} *Transaction Date:* ${order.transaction_date}`,
        '',
        `_Approved at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Payment for ${order.person_name} approved!`);

      broadcast('payment_approved', { ...order, triggeredBy: 'telegram' });
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
        '\u274C *Payment REJECTED*',
        '',
        `\u{1F464} *Person:* ${order.person_name}`,
        `\u{1F4B0} *Amount:* ${Number(order.price).toLocaleString()} R`,
        `\u{1F37D}\uFE0F *Order Date:* ${order.order_date}`,
        '',
        `_Rejected at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Payment for ${order.person_name} rejected!`);

      broadcast('payment_rejected', { ...order, triggeredBy: 'telegram' });
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
      if (order.telegram_order_chat_id && order.telegram_order_message_id) {
        await deleteMessage(order.telegram_order_chat_id, order.telegram_order_message_id);
      }
      await pool.query('DELETE FROM food_orders WHERE id = $1', [orderId]);
      const newText = [
        '\u{1F5D1}\uFE0F *Order DELETED*',
        '',
        `\u{1F464} *Person:* ${order.person_name}`,
        `\u{1F4B0} *Amount:* ${Number(order.price).toLocaleString()} R`,
        `\u{1F37D}\uFE0F *Order Date:* ${order.order_date}`,
        '',
        `_Deleted at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Order for ${order.person_name} deleted!`);

      broadcast('deletion_approved', {
        id: order.id, person_id: order.person_id, price: order.price, order_date: order.order_date, triggeredBy: 'telegram',
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
        '\u{1F6AB} *Delete REQUEST CANCELLED*',
        '',
        `\u{1F464} *Person:* ${order.person_name}`,
        `\u{1F4B0} *Amount:* ${Number(order.price).toLocaleString()} R`,
        `\u{1F37D}\uFE0F *Order Date:* ${order.order_date}`,
        '',
        `_Cancelled at ${khmNow()}_`,
      ].join('\n');
      await editMessageText(message.chat.id, message.message_id, newText, { reply_markup: { inline_keyboard: [] } });
      await answerCallbackQuery(id, `Delete request for ${order.person_name} cancelled!`);

      broadcast('deletion_cancelled', { ...order, triggeredBy: 'telegram' });
    }
  } catch (err) {
    console.error('Handle callback error:', err);
    await answerCallbackQuery(id, 'Error processing request');
  }
};
