import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASSWORD ?? 'app_pw_change_me',
  database: process.env.DB_NAME ?? 'red_tetris',
  port: parseInt(process.env.DB_PORT ?? '3306'),
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
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

export default pool;
