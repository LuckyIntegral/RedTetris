import dotenv from 'dotenv';
import path from 'path';

// Ensure tests run in test mode and load test env vars
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

import db, { runMigrations, testConnection } from '../db';
import { logger } from '../utils/logger';

before(async function () {
  logger.debug('Setting up test database connection and running migrations');
  const connectionOk = await testConnection();
  if (connectionOk === false) {
    logger.error('Test database connection failed');
    throw new Error('Failed to connect to test database');
  }
  await runMigrations();
});

afterEach(async () => {
  const conn = await db.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE games');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('TRUNCATE TABLE game_records');
  } finally {
    conn.release();
  }
});

after(async () => {
  logger.debug('All tests done, closing database connection pool');
  try {
    const conn = await db.getConnection();
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await db.end();
  } catch (err) {
    logger.warn('Error closing database connection pool:', err);
  }
});
