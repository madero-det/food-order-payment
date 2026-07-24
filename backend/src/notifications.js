import pool from './db.js';

function fmtDate(d) {
  if (!d) return '-';
  return String(d).substring(0, 10);
}

function fmtDateTime(dt) {
  if (!dt) return '-';
  const s = String(dt).replace(' ', 'T');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return String(dt);
  const h = Number(m[4]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${m[1]}-${m[2]}-${m[3]} ${h % 12 || 12}:${m[5]} ${ampm}`;
}

const NOTIFICATION_MAP = {
  payment_approved: (data) => ({
    user_id: data.person_id,
    type: 'payment_approved',
    title: 'Payment Approved',
    message: `Your payment for ${Number(data.price).toLocaleString()} R has been approved!\nOrder: ${fmtDate(data.order_date)}\nTxn: ${fmtDateTime(data.transaction_date)}`,
    order_id: data.id,
  }),
  payment_rejected: (data) => ({
    user_id: data.person_id,
    type: 'payment_rejected',
    title: 'Payment Rejected',
    message: `Your payment for ${Number(data.price).toLocaleString()} R has been rejected.\nOrder: ${fmtDate(data.order_date)}\nTxn: ${fmtDateTime(data.transaction_date)}`,
    order_id: data.id,
  }),
  deletion_cancelled: (data) => ({
    user_id: data.person_id,
    type: 'deletion_cancelled',
    title: 'Delete Request Cancelled',
    message: `Your delete request for order #${data.id} (${Number(data.price).toLocaleString()} R) has been cancelled.\nOrder: ${fmtDate(data.order_date)}`,
    order_id: data.id,
  }),
  deletion_approved: (data) => ({
    user_id: data.person_id,
    type: 'deletion_approved',
    title: 'Delete Request Approved',
    message: `Your delete request for order #${data.id} (${Number(data.price).toLocaleString()} R) has been approved.\nOrder: ${fmtDate(data.order_date)}`,
    order_id: data.id,
  }),
};

const ADMIN_EVENTS = ['payment_submitted', 'deletion_requested'];

const ADMIN_NOTIFICATION_MAP = {
  payment_submitted: (data, personName) => ({
    type: 'payment_submitted',
    title: 'Payment Pending Approval',
    message: `${personName} submitted a payment of ${Number(data.price).toLocaleString()} R for approval.\nOrder: ${fmtDate(data.order_date)}\nTxn: ${fmtDateTime(data.transaction_date)}`,
    order_id: data.id,
  }),
  deletion_requested: (data, personName) => ({
    type: 'deletion_requested',
    title: 'Delete Request Pending',
    message: `${personName} requested to delete order #${data.id} (${Number(data.price).toLocaleString()} R).\nOrder: ${fmtDate(data.order_date)}`,
    order_id: data.id,
  }),
};

export const saveNotification = async (event, data) => {
  const factory = NOTIFICATION_MAP[event];
  if (!factory) return;

  const notif = factory(data);
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, order_id) VALUES ($1, $2, $3, $4, $5)`,
      [notif.user_id, notif.type, notif.title, notif.message, notif.order_id || null]
    );
  } catch (err) {
    console.error('Failed to save notification:', err.message);
  }

  if (ADMIN_EVENTS.includes(event)) {
    try {
      const admins = await pool.query(`SELECT id FROM persons WHERE role = 'admin'`);
      const personResult = await pool.query(`SELECT name FROM persons WHERE id = $1`, [data.person_id]);
      const personName = personResult.rows[0]?.name || 'Unknown';
      const adminNotif = ADMIN_NOTIFICATION_MAP[event](data, personName);
      for (const admin of admins.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, order_id) VALUES ($1, $2, $3, $4, $5)`,
          [admin.id, adminNotif.type, adminNotif.title, adminNotif.message, adminNotif.order_id || null]
        );
      }
    } catch (err) {
      console.error('Failed to save admin notification:', err.message);
    }
  }
};

export const saveAdminPaymentNotification = async (data, personName) => {
  try {
    const admins = await pool.query(`SELECT id FROM persons WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, order_id) VALUES ($1, $2, $3, $4, $5)`,
        [admin.id, 'payment_updated', 'Payment Updated',
         `The payment for ${Number(data.price).toLocaleString()} R has been updated!\nName: ${personName}\nOrder: ${fmtDate(data.order_date)}\nTxn: ${fmtDateTime(data.transaction_date)}`,
         data.id || null]
      );
    }
  } catch (err) {
    console.error('Failed to save admin payment notification:', err.message);
  }
};
