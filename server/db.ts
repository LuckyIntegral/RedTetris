import mysql from 'mysql2/promise';

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
});

// Test the connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Database connection failed:', error.message);
    } else {
      console.error('❌ Database connection failed with unknown error');
    }
    return false;
  }
};

export default pool;
