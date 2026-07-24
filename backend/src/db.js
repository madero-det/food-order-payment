import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const defaultTypeParser = pg.types.getTypeParser;

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  types: {
    getTypeParser: (oid, format) => {
      if (oid === 1082) {
        return (value) => value.substring(0, 10);
      }
      if (oid === 1114) {
        return (value) => value;
      }
      return defaultTypeParser(oid, format);
    },
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS persons (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$ BEGIN
        ALTER TABLE persons ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE persons ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS food_orders (
        id SERIAL PRIMARY KEY,
        order_date DATE NOT NULL,
        person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        price DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2),
        transaction_date TIMESTAMP,
        payment_status VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$ BEGIN
        ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      ALTER TABLE food_orders ALTER COLUMN payment_status DROP DEFAULT;

      DO $$ BEGIN
        ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER;
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE persons ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255);
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        order_id INTEGER,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_date ON food_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_orders_person ON food_orders(person_id);
      CREATE INDEX IF NOT EXISTS idx_orders_paid ON food_orders(paid_amount);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
};

export default pool;
