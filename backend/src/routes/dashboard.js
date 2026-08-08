import { Router } from 'express';
import pool from '../db.js';
import xlsx from 'xlsx';
import { khmDate, khmMonth, khmYear } from '../khm-datetime.js';
import { getDashboardKey, getMonthlyKey, getOrSet } from '../cache.js';

const router = Router();

function todayKHM() {
  return khmDate();
}

router.get('/', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = month || khmMonth();
    const y = year || khmYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const isAdmin = req.user.role === 'admin';
    const cacheKey = getDashboardKey(isAdmin, req.user.id, y, m);
    const personFilterFo = isAdmin ? '' : ' AND fo.person_id = $3';
    const personFilterP = isAdmin ? '' : ' AND p.id = $3';
    const dateParams = isAdmin ? [startDate, endDate] : [startDate, endDate, req.user.id];

    const todayStr = todayKHM();
    const todayQuery = `SELECT fo.id, fo.order_date, fo.price, fo.paid_amount, fo.payment_status,
               p.name as person_name, p.profile_image as person_avatar
        FROM food_orders fo
        JOIN persons p ON fo.person_id = p.id
        WHERE fo.order_date = $1
        ORDER BY fo.order_date DESC, fo.id ASC`;
    const todayParams = [todayStr];

    const data = await getOrSet(cacheKey, 30, async () => {
      const [totalResult, paidResult, unpaidResult, dailyResult, personResult, todayResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as total_orders, COALESCE(SUM(price), 0) as total_price
           FROM food_orders fo WHERE fo.order_date BETWEEN $1 AND $2${personFilterFo}`,
          dateParams
        ),
        pool.query(
          `SELECT COUNT(*) as paid_orders, COALESCE(SUM(paid_amount), 0) as total_paid
           FROM food_orders fo WHERE fo.order_date BETWEEN $1 AND $2 AND fo.paid_amount IS NOT NULL${personFilterFo}`,
          dateParams
        ),
        pool.query(
          `SELECT COUNT(*) as unpaid_orders, COALESCE(SUM(price), 0) as total_unpaid
           FROM food_orders fo WHERE fo.order_date BETWEEN $1 AND $2 AND fo.paid_amount IS NULL${personFilterFo}`,
          dateParams
        ),
        pool.query(
          `SELECT fo.order_date, COUNT(*) as order_count, SUM(fo.price) as daily_total,
                  SUM(COALESCE(fo.paid_amount, 0)) as daily_paid
           FROM food_orders fo WHERE fo.order_date BETWEEN $1 AND $2${personFilterFo}
           GROUP BY fo.order_date ORDER BY fo.order_date`,
          dateParams
        ),
        pool.query(
          `SELECT p.id as person_id, p.name, p.profile_image as person_avatar,
                  COUNT(fo.id) as order_count,
                  COUNT(fo.id) FILTER (WHERE fo.paid_amount IS NULL) as unpaid_count,
                  SUM(fo.price) as total_spent,
                  SUM(COALESCE(fo.paid_amount, 0)) as total_paid
           FROM persons p
           LEFT JOIN food_orders fo ON p.id = fo.person_id AND fo.order_date BETWEEN $1 AND $2
           WHERE 1=1${personFilterP}
           GROUP BY p.id, p.name
           HAVING COUNT(fo.id) > 0
           ORDER BY total_spent DESC`,
          dateParams
        ),
        pool.query(todayQuery, todayParams),
      ]);

      return {
        period: { month: Number(m), year: Number(y) },
        summary: {
          total_orders: Number(totalResult.rows[0].total_orders),
          total_price: Number(totalResult.rows[0].total_price),
          paid_orders: Number(paidResult.rows[0].paid_orders),
          total_paid: Number(paidResult.rows[0].total_paid),
          unpaid_orders: Number(unpaidResult.rows[0].unpaid_orders),
          total_unpaid: Number(unpaidResult.rows[0].total_unpaid),
        },
        daily: dailyResult.rows.map((r) => ({
          date: r.order_date,
          order_count: Number(r.order_count),
          total: Number(r.daily_total),
          paid: Number(r.daily_paid),
        })),
        by_person: personResult.rows.map((r) => ({
          person_id: r.person_id,
          name: r.name,
          person_avatar: r.person_avatar,
          order_count: Number(r.order_count),
          unpaid_count: Number(r.unpaid_count),
          total_spent: Number(r.total_spent),
          total_paid: Number(r.total_paid),
        })),
        today_orders: todayResult.rows.map((r) => ({
          id: r.id,
          order_date: r.order_date,
          price: Number(r.price),
          paid_amount: r.paid_amount ? Number(r.paid_amount) : null,
          payment_status: r.payment_status,
          person_name: r.person_name,
          person_avatar: r.person_avatar,
        })),
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/unpaid', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = month || khmMonth();
    const y = year || khmYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const isAdmin = req.user.role === 'admin';
    const personFilter = isAdmin ? '' : ' AND fo.person_id = $3';
    const params = isAdmin ? [startDate, endDate] : [startDate, endDate, req.user.id];
    const result = await pool.query(
      `SELECT fo.id, fo.order_date, fo.price, p.name as person_name
       FROM food_orders fo
       JOIN persons p ON fo.person_id = p.id
       WHERE fo.paid_amount IS NULL AND fo.order_date BETWEEN $1 AND $2${personFilter}
       ORDER BY fo.order_date DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const { year } = req.query;
    const y = year || khmYear();
    const isAdmin = req.user.role === 'admin';
    const cacheKey = getMonthlyKey(isAdmin, req.user.id, y);

    const data = await getOrSet(cacheKey, 300, async () => {
      const startDate = `${y}-01-01`;
      const endDate = `${y}-12-31`;
      const personFilter = isAdmin ? '' : ' AND fo.person_id = $3';
      const params = isAdmin ? [startDate, endDate] : [startDate, endDate, req.user.id];

      const result = await pool.query(
        `SELECT EXTRACT(MONTH FROM fo.order_date)::int as month,
                SUM(fo.price) as total,
                SUM(COALESCE(fo.paid_amount, 0)) as paid
         FROM food_orders fo
         WHERE fo.order_date BETWEEN $1 AND $2${personFilter}
         GROUP BY EXTRACT(MONTH FROM fo.order_date)
         ORDER BY month`,
        params
      );

      return Array.from({ length: 12 }, (_, i) => {
        const row = result.rows.find(r => r.month === i + 1);
        return {
          month: i + 1,
          name: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
          total: row ? Number(row.total) : 0,
          paid: row ? Number(row.paid) : 0,
        };
      });
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = month || khmMonth();
    const y = year || khmYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const isAdmin = req.user.role === 'admin';
    const personFilter = isAdmin ? '' : ' AND fo.person_id = $3';
    const params = isAdmin ? [startDate, endDate] : [startDate, endDate, req.user.id];

    const result = await pool.query(
      `SELECT fo.order_date, p.name as person_name, fo.price, fo.paid_amount, fo.transaction_date,
              fo.payment_status, fo.payment_method, fo.notes
       FROM food_orders fo
       JOIN persons p ON fo.person_id = p.id
       WHERE fo.order_date BETWEEN $1 AND $2${personFilter}
       ORDER BY fo.order_date, p.name`,
      params
    );

    const data = result.rows.map(r => ({
      Date: r.order_date,
      Person: r.person_name,
      Price: Number(r.price),
      Paid: r.paid_amount ? Number(r.paid_amount) : 0,
      'Transaction Date': r.transaction_date || '-',
      Status: r.payment_status || (r.paid_amount ? 'approved' : 'unpaid'),
      Method: r.payment_method || '-',
      Notes: r.notes || '',
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Orders');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${y}-${String(m).padStart(2,'0')}.xlsx`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

export default router;
