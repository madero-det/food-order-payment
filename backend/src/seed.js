import pool, { initDB } from './db.js';
import bcrypt from 'bcryptjs';

const seedData = {
  persons: [
    'Bona', 'Denish', 'Sreythinh', 'Kimheang', 'Saven', 'Madero',
    'Sreymom', 'Chhordeth', 'Lyda', 'Sokty', 'Sreyni', 'Muny',
    'Piseth', 'Ouhsa',
  ],
  orders: [
    // 07-Jul
    { date: '2026-07-07', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-07 10:58:00' },
    { date: '2026-07-07', name: 'Denish', price: 7000, paid: 7000, tx: '2026-07-07 13:02:00' },
    { date: '2026-07-07', name: 'Sreythinh', price: 7000, paid: 7000, tx: '2026-07-08 19:17:00' },
    { date: '2026-07-07', name: 'Kimheang', price: 14000, paid: 14000, tx: '2026-07-09 08:05:00' },
    { date: '2026-07-07', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-08 08:05:00' },
    { date: '2026-07-07', name: 'Madero', price: 8000, paid: 8000, tx: '2026-07-08 08:39:00' },
    { date: '2026-07-07', name: 'Sreymom', price: 7000, paid: 7000, tx: '2026-07-07 12:43:00' },
    // 08-Jul
    { date: '2026-07-08', name: 'Sreymom', price: 7000, paid: 7000, tx: '2026-07-08 12:56:00' },
    { date: '2026-07-08', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-08 08:50:00' },
    { date: '2026-07-08', name: 'Kimheang', price: 15000, paid: 15000, tx: '2026-07-09 08:05:00' },
    { date: '2026-07-08', name: 'Sreythinh', price: 7000, paid: 7000, tx: '2026-07-08 19:17:00' },
    { date: '2026-07-08', name: 'Chhordeth', price: 14000, paid: 14000, tx: '2026-07-08 12:35:00' },
    { date: '2026-07-08', name: 'Lyda', price: 2000, paid: 2000, tx: '2026-07-08 11:55:00' },
    { date: '2026-07-08', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-09 08:01:00' },
    // 09-Jul
    { date: '2026-07-09', name: 'Sreymom', price: 7000, paid: 7000, tx: '2026-07-09 12:45:00' },
    { date: '2026-07-09', name: 'Madero', price: 7000, paid: 7000, tx: '2026-07-10 08:04:00' },
    { date: '2026-07-09', name: 'Denish', price: 7000, paid: 7000, tx: '2026-07-09 17:32:00' },
    { date: '2026-07-09', name: 'Kimheang', price: 14000, paid: 14000, tx: '2026-07-13 08:11:00' },
    { date: '2026-07-09', name: 'Sreythinh', price: 7000, paid: 7000, tx: '2026-07-10 20:50:00' },
    { date: '2026-07-09', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-09 10:53:00' },
    { date: '2026-07-09', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-10 08:08:00' },
    { date: '2026-07-09', name: 'Chhordeth', price: 14000, paid: 14000, tx: '2026-07-14 21:04:00' },
    { date: '2026-07-09', name: 'Sokty', price: 2000, paid: 2000, tx: '2026-07-10 16:30:00' },
    { date: '2026-07-09', name: 'Sreyni', price: 2000, paid: 2000, tx: '2026-07-09 13:12:00' },
    // 10-Jul
    { date: '2026-07-10', name: 'Bona', price: 8000, paid: 8000, tx: '2026-07-10 09:39:00' },
    { date: '2026-07-10', name: 'Madero', price: 7000, paid: 7000, tx: '2026-07-14 07:57:00' },
    { date: '2026-07-10', name: 'Sreymom', price: 8000, paid: 8000, tx: '2026-07-10 13:01:00' },
    { date: '2026-07-10', name: 'Kimheang', price: 16000, paid: 16000, tx: '2026-07-13 08:11:00' },
    { date: '2026-07-10', name: 'Sreythinh', price: 7000, paid: 7000, tx: '2026-07-10 20:50:00' },
    { date: '2026-07-10', name: 'Chhordeth', price: 15000, paid: 15000, tx: '2026-07-14 21:04:00' },
    { date: '2026-07-10', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-13 20:20:00' },
    { date: '2026-07-10', name: 'Denish', price: 7000, paid: 7000, tx: '2026-07-10 13:28:00' },
    // 13-Jul
    { date: '2026-07-13', name: 'Sreymom', price: 7000, paid: 7000, tx: '2026-07-13 13:02:00' },
    { date: '2026-07-13', name: 'Kimheang', price: 17000, paid: 17000, tx: '2026-07-15 10:36:00' },
    { date: '2026-07-13', name: 'Sreythinh', price: 7000, paid: 7000, tx: '2026-07-15 08:24:00' },
    { date: '2026-07-13', name: 'Denish', price: 7000, paid: 7000, tx: '2026-07-13 13:03:00' },
    { date: '2026-07-13', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-14 09:06:00' },
    { date: '2026-07-13', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-13 20:20:00' },
    { date: '2026-07-13', name: 'Lyda', price: 7000, paid: 7000, tx: '2026-07-13 13:29:00' },
    // 14-Jul
    { date: '2026-07-14', name: 'Sreymom', price: 7000, paid: 7000, tx: '2026-07-14 12:45:00' },
    { date: '2026-07-14', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-14 09:07:00' },
    { date: '2026-07-14', name: 'Madero', price: 7000, paid: 7000, tx: '2026-07-15 08:18:00' },
    { date: '2026-07-14', name: 'Kimheang', price: 14000, paid: 14000, tx: '2026-07-15 10:36:00' },
    { date: '2026-07-14', name: 'Sreythinh', price: 7000, paid: 7000, tx: '2026-07-15 08:24:00' },
    { date: '2026-07-14', name: 'Denish', price: 7000, paid: 7000, tx: '2026-07-14 16:33:00' },
    // 15-Jul
    { date: '2026-07-15', name: 'Sreymom', price: 8000, paid: 8000, tx: '2026-07-15 12:48:00' },
    { date: '2026-07-15', name: 'Madero', price: 7000, paid: 7000, tx: '2026-07-17 09:15:00' },
    { date: '2026-07-15', name: 'Denish', price: 8000, paid: 8000, tx: '2026-07-17 09:21:00' },
    { date: '2026-07-15', name: 'Chhordeth', price: 14000, paid: 14000, tx: '2026-07-17 08:03:00' },
    { date: '2026-07-15', name: 'Sreythinh', price: 5000, paid: 5000, tx: '2026-07-17 11:21:00' },
    { date: '2026-07-15', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-16 09:06:00' },
    { date: '2026-07-15', name: 'Kimheang', price: 10000, paid: 10000, tx: '2026-07-17 09:26:00' },
    { date: '2026-07-15', name: 'Muny', price: 7000, paid: null, tx: null },
    { date: '2026-07-15', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-16 08:23:00' },
    // 16-Jul
    { date: '2026-07-16', name: 'Bona', price: 7000, paid: 7000, tx: '2026-07-16 09:06:00' },
    { date: '2026-07-16', name: 'Madero', price: 8000, paid: 8000, tx: '2026-07-17 09:24:00' },
    { date: '2026-07-16', name: 'Denish', price: 10000, paid: 10000, tx: '2026-07-16 13:12:00' },
    { date: '2026-07-16', name: 'Sreythinh', price: 8000, paid: 8000, tx: '2026-07-17 11:21:00' },
    { date: '2026-07-16', name: 'Sreymom', price: 8000, paid: 8000, tx: '2026-07-16 12:43:00' },
    { date: '2026-07-16', name: 'Kimheang', price: 8000, paid: 8000, tx: '2026-07-17 09:26:00' },
    { date: '2026-07-16', name: 'Muny', price: 8000, paid: null, tx: null },
    { date: '2026-07-16', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-17 09:13:00' },
    // 17-Jul
    { date: '2026-07-17', name: 'Bona', price: 9000, paid: 9000, tx: '2026-07-17 11:15:00' },
    { date: '2026-07-17', name: 'Sreymom', price: 5000, paid: 5000, tx: '2026-07-17 12:52:00' },
    { date: '2026-07-17', name: 'Ouhsa', price: 7000, paid: 7000, tx: '2026-07-17 13:03:00' },
    { date: '2026-07-17', name: 'Madero', price: 7000, paid: 7000, tx: '2026-07-20 08:55:00' },
    { date: '2026-07-17', name: 'Sreyni', price: 7000, paid: 7000, tx: '2026-07-17 13:09:00' },
    { date: '2026-07-17', name: 'Muny', price: 7000, paid: null, tx: null },
    { date: '2026-07-17', name: 'Chhordeth', price: 14000, paid: 14000, tx: '2026-07-20 08:03:00' },
    { date: '2026-07-17', name: 'Piseth', price: 14000, paid: 14000, tx: '2026-07-20 08:56:00' },
    { date: '2026-07-17', name: 'Sreythinh', price: 7000, paid: null, tx: null },
    { date: '2026-07-17', name: 'Saven', price: 7000, paid: 7000, tx: '2026-07-20 09:12:00' },
    // 20-Jul
    { date: '2026-07-20', name: 'Bona', price: 9000, paid: 9000, tx: '2026-07-20 09:26:00' },
    { date: '2026-07-20', name: 'Sreymom', price: 7000, paid: 7000, tx: '2026-07-20 13:04:00' },
    { date: '2026-07-20', name: 'Madero', price: 7000, paid: null, tx: null },
    { date: '2026-07-20', name: 'Sreythinh', price: 8000, paid: null, tx: null },
    { date: '2026-07-20', name: 'Denish', price: 7000, paid: 7000, tx: '2026-07-20 13:03:00' },
    { date: '2026-07-20', name: 'Kimheang', price: 14000, paid: null, tx: null },
    { date: '2026-07-20', name: 'Saven', price: 7000, paid: null, tx: null },
    { date: '2026-07-20', name: 'Sreyni', price: 2000, paid: 2000, tx: '2026-07-20 13:36:00' },
  ],
};

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM food_orders');
    await client.query('DELETE FROM persons');

    for (const name of seedData.persons) {
      const hash = await bcrypt.hash('password123', 10);
      const role = name === 'Madero' ? 'admin' : 'user';
      await client.query('INSERT INTO persons (name, password_hash, role) VALUES ($1, $2, $3)', [name, hash, role]);
    }

    const personMap = {};
    const persons = await client.query('SELECT id, name FROM persons');
    for (const p of persons.rows) {
      personMap[p.name] = p.id;
    }

    for (const order of seedData.orders) {
      const status = order.paid ? 'approved' : null;
      await client.query(
        `INSERT INTO food_orders (order_date, person_id, price, paid_amount, transaction_date, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.date, personMap[order.name], order.price, order.paid || null, order.tx || null, status]
      );
    }

    console.log(`Seeded ${seedData.persons.length} persons and ${seedData.orders.length} orders`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
};

await initDB();
seed();
