// db.js - PostgreSQL connection for EasyTrak backend
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = String(process.env.DATABASE_URL || '').trim();
const shouldUseSsl = process.env.PGSSLMODE === 'require' || /render\.com$/i.test(String(process.env.PGHOST || '').trim());

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'easytrak',
      password: process.env.PGPASSWORD || '',
      port: Number(process.env.PGPORT || 5432),
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    });

export default pool;
