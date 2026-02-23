import dotenv from 'dotenv';
import path from 'path';

import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import { logger } from './utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

logger.info('ENV used:', process.env.NODE_ENV);

const dbPortRaw = process.env.DB_PORT ?? '3306';
let dbPort = Number.parseInt(dbPortRaw, 10);
dbPort = Number.isNaN(dbPort) ? 3306 : dbPort;

let dbPassword, dbName;

if (process.env.NODE_ENV === 'test') {
  dbPassword = process.env.DB_PASSWORD_TEST ?? 'app_change_me';
  dbName = process.env.DB_NAME_TEST ?? 'red_tetris_test';
} else {
  dbPassword = process.env.DB_PASSWORD ?? 'app_change_me';
  dbName = process.env.DB_NAME ?? 'red_tetris';
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ Database connected successfully');
    connection.release();
    return true;
  } catch {
    logger.error('❌ Database connection failed');
    return false;
  }
};

export const runMigrations = async (): Promise<void> => {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  let conn: mysql.PoolConnection | undefined;

  try {
    const stat = await fs.stat(migrationsDir).catch(() => null);
    if (!stat?.isDirectory()) {
      logger.info(`No migrations directory found at ${migrationsDir} — skipping migrations`);
      return;
    }

    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
    if (sqlFiles.length === 0) {
      logger.info(`No .sql migration files found in ${migrationsDir} — skipping migrations`);
      return;
    }

    conn = await pool.getConnection();

    await conn.query(
      `CREATE TABLE IF NOT EXISTS migrations (
         id INT AUTO_INCREMENT PRIMARY KEY,
         filename VARCHAR(255) NOT NULL UNIQUE,
         applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );

    for (const file of sqlFiles) {
      const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT 1 FROM migrations WHERE filename = ? LIMIT 1', [
        file,
      ]);
      if (Array.isArray(rows) && rows.length > 0) {
        logger.info(`Skipping already applied migration ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      logger.info(`Applying migration ${file}`);
      const sql = await fs.readFile(filePath, 'utf8');

      // execute the migration SQL (multipleStatements enabled above)
      await conn.query(sql);

      // record applied migration
      await conn.query('INSERT INTO migrations (filename) VALUES (?)', [file]);
      logger.info(`Applied ${file}`);
    }

    logger.info('All migrations applied successfully');
  } catch (err: unknown) {
    logger.error('Migrations failed:', err);
  } finally {
    if (conn) conn.release();
  }
};

export default pool;
