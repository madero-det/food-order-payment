import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import pool, { initDB } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', '..', 'Food_Order_Jun.xlsx');

const nameFixes = { 'Densih': 'Denish' };

const wb = xlsx.readFile(filePath);
const sheetNames = wb.SheetNames;
const personsList = new Set();
const orders = [];

for (const sheetName of sheetNames) {
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).filter(r => r.length > 0);

  const dateMatch = sheetName.match(/(\d{2})-(\w{3})/i);
  if (!dateMatch) continue;

  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const month = months[dateMatch[2].toLowerCase()];
  const day = dateMatch[1];
  const orderDate = `2026-${month}-${day}`;

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
    orders.push({
      date: orderDate,
      name,
      price: Number(price),
      paid: paid ? Number(paid) : null,
      tx,
    });
  }
}

console.log(`Found ${personsList.size} persons, ${orders.length} orders`);

const importData = async () => {
  await initDB();
  const client = await pool.connect();
  try {
    // Get existing persons
    const existing = await client.query('SELECT id, name FROM persons');
    const personMap = {};
    for (const p of existing.rows) {
      personMap[p.name] = p.id;
    }

    // Create new persons
    for (const name of personsList) {
      if (!personMap[name]) {
        const hash = await bcrypt.hash('password123', 10);
        const res = await client.query(
          'INSERT INTO persons (name, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
          [name, hash, 'user']
        );
        personMap[name] = res.rows[0].id;
        console.log(`Created person: ${name}`);
      }
    }

    // Check existing orders for June 2026 to avoid duplicates
    const existingOrders = await client.query(
      `SELECT id FROM food_orders WHERE order_date >= $1 AND order_date <= $2`,
      ['2026-06-01', '2026-06-30']
    );
    if (existingOrders.rows.length > 0) {
      console.log(`Deleting ${existingOrders.rows.length} existing June orders...`);
      await client.query(
        `DELETE FROM food_orders WHERE order_date >= $1 AND order_date <= $2`,
        ['2026-06-01', '2026-06-30']
      );
    }

    // Insert orders
    let count = 0;
    for (const order of orders) {
      const status = order.paid ? 'approved' : null;
      await client.query(
        `INSERT INTO food_orders (order_date, person_id, price, paid_amount, transaction_date, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.date, personMap[order.name], order.price, order.paid, order.tx, status]
      );
      count++;
    }

    console.log(`Imported ${count} orders for June 2026`);
  } catch (err) {
    console.error('Import error:', err);
  } finally {
    client.release();
    pool.end();
  }
};

importData();
