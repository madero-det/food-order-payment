import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { sendPaymentNotification, sendDeletionNotification, editMessageText } from '../telegram.js';
import { broadcast } from '../events.js';
import { saveAdminPaymentNotification } from '../notifications.js';
import { khmNow } from '../khm-datetime.js';

const router = Router();

function isValidDate(str) {
  if (!str) return true;
  const match = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return false;
  const d = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  return d.getUTCFullYear() === Number(match[1]) && (d.getUTCMonth() + 1) === Number(match[2]) && d.getUTCDate() === Number(match[3]);
}

function isValidDateTime(str) {
  if (!str) return true;
  const match = String(str).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return false;
  const d = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00Z`);
  return d.getUTCFullYear() === Number(match[1]) && (d.getUTCMonth() + 1) === Number(match[2]) && d.getUTCDate() === Number(match[3]);
}

router.get('/', async (req, res, next) => {
  try {
    const { date, start_date, end_date, person_id, paid, page, limit } = req.query;
    const isAdmin = req.user.role === 'admin';
    const pgNum = Math.max(1, parseInt(page) || 1);
    const pgSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pgNum - 1) * pgSize;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (!isAdmin) {
      whereClause += ` AND fo.person_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    if (date) {
      whereClause += ` AND fo.order_date = $${paramIndex++}`;
      params.push(date);
    }
    if (start_date) {
      whereClause += ` AND fo.order_date >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ` AND fo.order_date <= $${paramIndex++}`;
      params.push(end_date);
    }
    if (isAdmin && person_id) {
      whereClause += ` AND fo.person_id = $${paramIndex++}`;
      params.push(person_id);
    }
    if (paid === 'true') {
      whereClause += ` AND fo.paid_amount IS NOT NULL`;
    } else if (paid === 'false') {
      whereClause += ` AND fo.paid_amount IS NULL`;
    }

    const countQuery = `SELECT COUNT(*) FROM food_orders fo ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const filterParams = [...params];

    const dataQuery = `
      SELECT fo.id, fo.order_date, fo.price, fo.paid_amount, fo.transaction_date, fo.payment_status, fo.deletion_status,
             fo.notes, fo.payment_method,
             p.id as person_id, p.name as person_name, p.profile_image as person_avatar,
              COALESCE(json_agg(json_build_object(
                'id', oi.id, 'menu_item_id', oi.menu_item_id, 'quantity', oi.quantity, 'price', oi.price,
                'name', mi.name, 'type', mi.type, 'is_rice', mi.is_rice
              ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) as items
      FROM food_orders fo
      JOIN persons p ON fo.person_id = p.id
      LEFT JOIN order_items oi ON fo.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      ${whereClause}
      GROUP BY fo.id, p.id, p.name, p.profile_image
      ORDER BY fo.order_date DESC, fo.id ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(pgSize, offset);

    const result = await pool.query(dataQuery, params);
    let summary = null;

    if (person_id || (!isAdmin && req.user.id)) {
      const summaryQuery = `
        SELECT COUNT(*) as total_orders,
               COALESCE(SUM(fo.price), 0) as total_spent,
               COALESCE(SUM(fo.paid_amount), 0) as total_paid,
               COALESCE(SUM(CASE WHEN fo.paid_amount IS NULL THEN fo.price ELSE 0 END), 0) as total_unpaid
        FROM food_orders fo ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, filterParams);
      summary = summaryResult.rows[0];
    }

    res.json({
      orders: result.rows,
      total,
      page: pgNum,
      limit: pgSize,
      totalPages: Math.ceil(total / pgSize),
      summary,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    const check = await pool.query('SELECT person_id FROM food_orders WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!isAdmin && check.rows[0].person_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT fo.id, fo.order_date, fo.price, fo.paid_amount, fo.transaction_date, fo.payment_status, fo.deletion_status,
              fo.notes, fo.payment_method,
              p.id as person_id, p.name as person_name, p.profile_image as person_avatar,
              COALESCE(json_agg(json_build_object(
                'id', oi.id, 'menu_item_id', oi.menu_item_id, 'quantity', oi.quantity, 'price', oi.price,
                'name', mi.name, 'type', mi.type, 'is_rice', mi.is_rice
              ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) as items
       FROM food_orders fo
       JOIN persons p ON fo.person_id = p.id
       LEFT JOIN order_items oi ON fo.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE fo.id = $1
       GROUP BY fo.id, p.id, p.name, p.profile_image`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { order_date, paid_amount, transaction_date, notes, payment_method, items } = req.body;
    const isAdmin = req.user.role === 'admin';
    const person_id = isAdmin ? req.body.person_id : req.user.id;
    if (!order_date || !person_id) {
      client.release();
      return res.status(400).json({ error: 'order_date and person_id are required' });
    }

    let totalPrice = 0;
    if (items && items.length) {
      for (const item of items) {
        if (!item.menu_item_id) {
          client.release();
          return res.status(400).json({ error: 'Each item needs a menu_item_id' });
        }
        totalPrice += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }
    } else {
      const price = req.body.price;
      if (!price) {
        client.release();
        return res.status(400).json({ error: 'price or items are required' });
      }
      totalPrice = Number(price);
    }
    if (!isValidDate(order_date)) {
      client.release();
      return res.status(400).json({ error: 'Invalid order_date' });
    }
    if (!isValidDateTime(transaction_date)) {
      client.release();
      return res.status(400).json({ error: 'Invalid transaction_date' });
    }

    if (!isAdmin && paid_amount) {
      if (!payment_method) {
        client.release();
        return res.status(400).json({ error: 'Payment method is required when paying' });
      }
      if (!transaction_date) {
        client.release();
        return res.status(400).json({ error: 'Transaction date is required when paying' });
      }
    }

    const payment_status = !isAdmin && paid_amount ? 'pending' : null;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO food_orders (order_date, person_id, price, paid_amount, transaction_date, notes, payment_method, payment_status, menu_item_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [order_date, person_id, totalPrice, paid_amount || null, transaction_date || null, notes || null, payment_method || null, payment_status, null]
    );
    const order = result.rows[0];

    if (items && items.length) {
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.id, item.menu_item_id, item.quantity || 1, item.price]
        );
      }
    }

    await client.query('COMMIT');
    client.release();

    const personResult = await pool.query('SELECT name, profile_image FROM persons WHERE id = $1', [person_id]);
    const personName = personResult.rows[0].name;
    const personAvatar = personResult.rows[0].profile_image;

    const orderItems = items?.length ? await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price, mi.name, mi.type, mi.is_rice
       FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1 ORDER BY oi.id`, [order.id]
    ) : { rows: [] };

    broadcast('order_created', {
      ...order,
      person_name: personName,
      person_avatar: personAvatar,
      items: orderItems.rows,
      triggeredBy: req.user.id,
    });

    res.status(201).json({ ...order, person_name: personName, person_avatar: personAvatar, items: orderItems.rows });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    client.release();
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const { order_date, person_id, price, paid_amount, transaction_date, notes, payment_method, items } = req.body;

    if (!isAdmin) {
      const check = await pool.query('SELECT person_id, price, paid_amount as old_paid FROM food_orders WHERE id = $1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      if (check.rows[0].person_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

      if (!isValidDateTime(transaction_date)) {
        return res.status(400).json({ error: 'Invalid transaction_date' });
      }

      const hasNewPayment = paid_amount != null && check.rows[0].old_paid == null;
      if (hasNewPayment) {
        if (!payment_method) return res.status(400).json({ error: 'Payment method is required when paying' });
        if (!transaction_date) return res.status(400).json({ error: 'Transaction date is required when paying' });
      }
      const paymentStatus = hasNewPayment ? 'pending' : null;

      const result = await pool.query(
        `UPDATE food_orders
         SET paid_amount = $1,
             transaction_date = $2,
             payment_status = COALESCE($4, payment_status),
             payment_method = COALESCE($5, payment_method),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [paid_amount || null, transaction_date || null, id, paymentStatus, payment_method || null]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = result.rows[0];
      const personResult = await pool.query('SELECT name FROM persons WHERE id = $1', [order.person_id]);

      if (hasNewPayment) {
        sendPaymentNotification({
          personName: personResult.rows[0].name,
          price: order.price,
          paidAmount: order.paid_amount,
          orderDate: order.order_date,
          transactionDate: order.transaction_date,
          orderId: order.id,
          paymentStatus: 'pending',
        }).then(async (tgResult) => {
          if (tgResult) {
            await pool.query(
              `UPDATE food_orders SET telegram_chat_id = $1, telegram_message_id = $2 WHERE id = $3`,
              [tgResult.chatId, tgResult.messageId, order.id]
            );
          }
        }).catch(() => {});

        broadcast('payment_submitted', {
          ...order,
          person_name: personResult.rows[0].name,
          triggeredBy: req.user.id,
        });
      } else {
        broadcast('order_updated', {
          ...order,
          person_name: personResult.rows[0].name,
          triggeredBy: req.user.id,
        });
      }

      const orderItems = await pool.query(
        `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price, mi.name, mi.type, mi.is_rice
         FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1 ORDER BY oi.id`, [id]
      );

      return res.json({ ...order, person_name: personResult.rows[0].name, items: orderItems.rows });
    }

    if (!isValidDate(order_date)) {
      return res.status(400).json({ error: 'Invalid order_date' });
    }
    if (!isValidDateTime(transaction_date)) {
      return res.status(400).json({ error: 'Invalid transaction_date' });
    }

    const result = await pool.query(
      `UPDATE food_orders
       SET order_date = COALESCE($1, order_date),
           person_id = COALESCE($2, person_id),
           price = COALESCE($3, price),
           paid_amount = $4,
           transaction_date = $5,
           notes = COALESCE($6, notes),
           payment_method = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [order_date, person_id, price, paid_amount || null, transaction_date || null, notes || null, payment_method || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    const personResult = await pool.query('SELECT name FROM persons WHERE id = $1', [order.person_id]);
    const personName = personResult.rows[0].name;

    if (items !== undefined) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
        let totalPrice = 0;
        for (const item of items) {
          if (item.menu_item_id) {
            await client.query(
              'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
              [id, item.menu_item_id, item.quantity || 1, item.price]
            );
            totalPrice += (Number(item.price) || 0) * (Number(item.quantity) || 1);
          }
        }
        if (items.length > 0) {
          await client.query('UPDATE food_orders SET price = $1 WHERE id = $2', [totalPrice, id]);
        }
        await client.query('COMMIT');
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw err;
      } finally {
        client.release();
      }
    }

    const orderItems = items?.length ? await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price, mi.name, mi.type, mi.is_rice
       FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1 ORDER BY oi.id`, [id]
    ) : { rows: [] };

    broadcast('order_updated', {
      ...order,
      person_name: personName,
      items: orderItems.rows,
      triggeredBy: req.user.id,
    });

    res.json({ ...order, person_name: personName, items: orderItems.rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const check = await pool.query(
        'SELECT id, person_id, deletion_status FROM food_orders WHERE id = $1', [id]
      );
      if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      if (check.rows[0].person_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
      if (check.rows[0].deletion_status === 'pending') return res.status(400).json({ error: 'Deletion already requested' });

      await pool.query(
        `UPDATE food_orders SET deletion_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      const orderResult = await pool.query(
        `SELECT fo.*, p.name as person_name FROM food_orders fo JOIN persons p ON fo.person_id = p.id WHERE fo.id = $1`,
        [id]
      );
      const order = orderResult.rows[0];

      sendDeletionNotification({
        orderId: order.id,
        personName: order.person_name,
        price: order.price,
        orderDate: order.order_date,
        requestedBy: req.user.name || 'User',
      }).then(async (tgResult) => {
        if (tgResult) {
          await pool.query(
            `UPDATE food_orders SET telegram_chat_id = $1, telegram_message_id = $2 WHERE id = $3`,
            [tgResult.chatId, tgResult.messageId, order.id]
          );
        }
      }).catch(() => {});

      broadcast('deletion_requested', {
        ...order,
        triggeredBy: req.user.id,
      });

      return res.json({ message: 'Deletion request sent', id: order.id, deletion_status: 'pending' });
    }

    const result = await pool.query('DELETE FROM food_orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const deletedOrder = result.rows[0];

    if (deletedOrder.telegram_chat_id && deletedOrder.telegram_message_id) {
      const personRes = await pool.query('SELECT name FROM persons WHERE id = $1', [deletedOrder.person_id]);
      const personName = personRes.rows[0]?.name || 'Unknown';
      const newText = [
        '🗑️ *Order DELETED*',
        '',
        `👤 *Person:* ${personName}`,
        `💰 *Amount:* ${Number(deletedOrder.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${deletedOrder.order_date}`,
        '',
        `_Deleted via web at ${khmNow()}_`,
      ].join('\n');
      editMessageText(deletedOrder.telegram_chat_id, deletedOrder.telegram_message_id, newText, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }

    broadcast('order_deleted', {
      id: deletedOrder.id,
      person_id: deletedOrder.person_id,
      triggeredBy: req.user.id,
    });

    res.json({ message: 'Order deleted', id: deletedOrder.id });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/pay', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const check = await pool.query('SELECT person_id FROM food_orders WHERE id = $1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      if (check.rows[0].person_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    }

    const { paid_amount, transaction_date, payment_method } = req.body;
    if (transaction_date && !isValidDateTime(transaction_date)) {
      return res.status(400).json({ error: 'Invalid transaction_date' });
    }
    
    const payment_status = isAdmin ? 'approved' : 'pending';
    
    const result = await pool.query(
      `UPDATE food_orders
       SET paid_amount = COALESCE($1, price),
           transaction_date = COALESCE($2, CURRENT_TIMESTAMP),
           payment_status = $3,
           payment_method = COALESCE($4, payment_method),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [paid_amount || null, transaction_date || null, payment_status, payment_method || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    const personResult = await pool.query('SELECT name FROM persons WHERE id = $1', [order.person_id]);
    const personName = personResult.rows[0].name;

    sendPaymentNotification({
      personName,
      price: order.price,
      paidAmount: order.paid_amount,
      orderDate: order.order_date,
      transactionDate: order.transaction_date,
      orderId: order.id,
      paymentStatus: payment_status,
    }).then(async (tgResult) => {
      if (tgResult && payment_status === 'pending') {
        await pool.query(
          `UPDATE food_orders SET telegram_chat_id = $1, telegram_message_id = $2 WHERE id = $3`,
          [tgResult.chatId, tgResult.messageId, order.id]
        );
      }
    }).catch(() => {});

    broadcast(isAdmin ? 'payment_approved' : 'payment_submitted', {
      ...order,
      person_name: personName,
      triggeredBy: req.user.id,
    });

    if (isAdmin) {
      saveAdminPaymentNotification(order, personName).catch(() => {});
    }

    res.json({ ...order, person_name: personName });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE food_orders SET payment_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    const personResult = await pool.query('SELECT name FROM persons WHERE id = $1', [order.person_id]);
    const personName = personResult.rows[0].name;

    if (order.telegram_chat_id && order.telegram_message_id) {
      const newText = [
        '✅ *Payment APPROVED*',
        '',
        `👤 *Person:* ${personName}`,
        `💰 *Amount:* ${Number(order.paid_amount || order.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        `📅 *Transaction Date:* ${order.transaction_date}`,
        '',
        `_Approved via web at ${khmNow()}_`,
      ].join('\n');
      editMessageText(order.telegram_chat_id, order.telegram_message_id, newText, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }

    broadcast('payment_approved', {
      ...order,
      person_name: personName,
      triggeredBy: req.user.id,
      fromApproval: true,
    });

    res.json({ ...order, person_name: personName });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE food_orders SET paid_amount = NULL, transaction_date = NULL, payment_status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    const personResult = await pool.query('SELECT name FROM persons WHERE id = $1', [order.person_id]);
    const personName = personResult.rows[0].name;

    if (order.telegram_chat_id && order.telegram_message_id) {
      const newText = [
        '❌ *Payment REJECTED*',
        '',
        `👤 *Person:* ${personName}`,
        `💰 *Amount:* ${Number(order.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        '',
        `_Rejected via web at ${khmNow()}_`,
      ].join('\n');
      editMessageText(order.telegram_chat_id, order.telegram_message_id, newText, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }

    broadcast('payment_rejected', {
      ...order,
      person_name: personName,
      triggeredBy: req.user.id,
    });

    res.json({ ...order, person_name: personName });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve-deletion', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM food_orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const deletedOrder = result.rows[0];

    if (deletedOrder.telegram_chat_id && deletedOrder.telegram_message_id) {
      const personRes = await pool.query('SELECT name FROM persons WHERE id = $1', [deletedOrder.person_id]);
      const personName = personRes.rows[0]?.name || 'Unknown';
      const newText = [
        '✅ *Deletion APPROVED*',
        '',
        `👤 *Person:* ${personName}`,
        `💰 *Amount:* ${Number(deletedOrder.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${deletedOrder.order_date}`,
        '',
        `_Approved via web at ${khmNow()}_`,
      ].join('\n');
      editMessageText(deletedOrder.telegram_chat_id, deletedOrder.telegram_message_id, newText, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }

    broadcast('deletion_approved', {
      id: deletedOrder.id,
      person_id: deletedOrder.person_id,
      price: deletedOrder.price,
      order_date: deletedOrder.order_date,
      triggeredBy: req.user.id,
    });

    res.json({ message: 'Deletion approved and order deleted', id: deletedOrder.id });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel-deletion', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE food_orders SET deletion_status = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    const personResult = await pool.query('SELECT name FROM persons WHERE id = $1', [order.person_id]);
    const personName = personResult.rows[0].name;

    if (order.telegram_chat_id && order.telegram_message_id) {
      const newText = [
        '❌ *Deletion CANCELLED*',
        '',
        `👤 *Person:* ${personName}`,
        `💰 *Amount:* ${Number(order.price).toLocaleString()} R`,
        `🍽️ *Order Date:* ${order.order_date}`,
        '',
        `_Cancelled via web at ${khmNow()}_`,
      ].join('\n');
      editMessageText(order.telegram_chat_id, order.telegram_message_id, newText, { reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }

    broadcast('deletion_cancelled', {
      ...order,
      person_name: personName,
      triggeredBy: req.user.id,
    });

    res.json({ ...order, person_name: personName });
  } catch (err) {
    next(err);
  }
});

export default router;
