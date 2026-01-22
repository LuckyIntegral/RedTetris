import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import cors from 'cors';
import express, { Request, Response } from 'express';
import db, { testConnection } from './db';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Red Tetris API' });
});

app.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.json({ status: 'ok', database: dbConnected ? 'connected' : 'disconnected' });
});

const logDbError = (context: string, error: unknown): void => {
  const safeErrorInfo =
    error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error type' };

  console.error('Database error', { context, error: safeErrorInfo });
};

// Example database query endpoint
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, data: rows });
  } catch (error: unknown) {
    logDbError('GET /api/test-db', error);
    res
      .status(500)
      .json({
        success: false,
        error: { code: 'DB_TEST_QUERY_FAILED', message: 'Database query failed while executing test query.' },
      });
  }
});

// Start server
const startServer = async () => {
  // Test database connection on startup
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Server will not start.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
