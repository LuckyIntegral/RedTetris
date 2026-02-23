import dotenv from 'dotenv';
import path from 'path';

import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import { logger } from './utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const dbPortRaw = process.env.DB_PORT ?? '3306';
const dbPort = Number.parseInt(dbPortRaw, 10);
if (Number.isNaN(dbPort)) {
  throw new Error(`Invalid DB_PORT value "${dbPortRaw}". It must be a valid integer.`);
}

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  throw new Error('DB_PASSWORD environment variable is required for database connection');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'app',
  password: dbPassword,
  database: process.env.DB_NAME ?? 'red_tetris',
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('❌ Database connection failed:', error.message);
    } else {
      logger.error('❌ Database connection failed with unknown error');
    }
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
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

export default pool;
