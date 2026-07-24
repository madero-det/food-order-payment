import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import pool, { initDB } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nameFixes = {
  'Densih': 'Denish',
  'Ouha': 'Ouhsa',
  'Chhorderth': 'Chhordeth',
  'Soty': 'Sokty',
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

function lastDayOfMonth(year, monthNum) {
  return new Date(year, monthNum, 0).getDate().toString().padStart(2, '0');
}

function parseFile(monthName) {
  const filePath = path.join(__dirname, '..', '..', `Food_Order_${monthName}.xlsx`);
  console.log(`\n=== Processing ${monthName} ===`);

  const monthNum = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05' };
  const mn = monthNum[monthName];

  const wb = xlsx.readFile(filePath);
  const personsList = new Set();
  const orders = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r.length > 0);

    const dateMatch = sheetName.match(/(\d{2})-\w{3}/i);
    if (!dateMatch) continue;

    const day = dateMatch[1];
    const orderDate = `2026-${mn}-${day}`;

    const headerRow = rows[0];
    const nameCol = headerRow.findIndex(h => h && String(h).toLowerCase().includes('name'));
    const priceCol = headerRow.findIndex(h => h && String(h).toLowerCase().includes('price'));
    const paidCol = headerRow.findIndex(h => h && String(h).toLowerCase().includes('paid'));
    const txCol = headerRow.findIndex(h => h && String(h).toLowerCase().includes('transaction'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rawName = row[nameCol];
      if (!rawName || String(rawName).toLowerCase() === 'name' || String(rawName).match(/^\d+$/)) continue;

      const price = row[priceCol];
      if (!price) continue;

      let paid = paidCol >= 0 ? row[paidCol] : null;
      let tx = txCol >= 0 ? row[txCol] : null;

      if (paid === 0 || paid === undefined || paid === '' || paid === null) paid = null;

      if (tx && typeof tx === 'number' && tx > 1000) {
        const d = new Date((tx - 25569) * 86400000);
        tx = d.toISOString().replace('T', ' ').substring(0, 19);
      } else if (tx === '' || tx === undefined || (typeof tx === 'number' && tx <= 0)) {
        tx = null;
      }

      const name = nameFixes[String(rawName).trim()] || String(rawName).trim();
      personsList.add(name);
      orders.push({ date: orderDate, name, price: Number(price), paid: paid ? Number(paid) : null, tx });
    }
  }

  return { monthName, monthNum: mn, personsList, orders };
}

const importData = async () => {
  await initDB();
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id, name FROM persons');
    const personMap = {};
    for (const p of existing.rows) {
      personMap[p.name] = p.id;
    }

    let totalOrders = 0;

    for (const monthName of months) {
      const data = parseFile(monthName);
      console.log(`  Persons: ${data.personsList.size}, Orders: ${data.orders.length}`);

      // Create new persons
      for (const name of data.personsList) {
        if (!personMap[name]) {
          const hash = await bcrypt.hash('password123', 10);
          const res = await client.query(
            'INSERT INTO persons (name, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
            [name, hash, 'user']
          );
          personMap[name] = res.rows[0].id;
          console.log(`  + New person: ${name}`);
        }
      }

      // Delete existing orders for this month
      const year = 2026;
      const monthInt = parseInt(data.monthNum);
      const startDate = `${year}-${data.monthNum}-01`;
      const endDate = `${year}-${data.monthNum}-${lastDayOfMonth(year, monthInt)}`;
      const existingOrders = await client.query(
        `SELECT COUNT(*) FROM food_orders WHERE order_date >= $1 AND order_date <= $2`,
        [startDate, endDate]
      );
      if (existingOrders.rows[0].count > 0) {
        await client.query(
          `DELETE FROM food_orders WHERE order_date >= $1 AND order_date <= $2`,
          [startDate, endDate]
        );
      }

      // Insert orders
      for (const order of data.orders) {
        const status = order.paid ? 'approved' : null;
        await client.query(
          `INSERT INTO food_orders (order_date, person_id, price, paid_amount, transaction_date, payment_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.date, personMap[order.name], order.price, order.paid, order.tx, status]
        );
      }
      totalOrders += data.orders.length;
    }

    console.log(`\n=== Done: Imported ${totalOrders} orders across Jan-May 2026 ===`);
    const count = await client.query('SELECT COUNT(*) FROM persons');
    console.log(`Total persons: ${count.rows[0].count}`);
    const total = await client.query('SELECT COUNT(*) FROM food_orders');
    console.log(`Total orders: ${total.rows[0].count}`);
  } catch (err) {
    console.error('Import error:', err);
  } finally {
    client.release();
    pool.end();
  }
};

importData();
