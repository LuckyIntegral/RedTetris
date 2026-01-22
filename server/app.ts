import dotenv from 'dotenv';

dotenv.config();

import cors from 'cors';
import express, { Request, Response } from 'express';
import db, { testConnection } from './db';

dotenv.config();

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

// Example database query endpoint
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// Start server
const startServer = async () => {
  // Test database connection on startup
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
};

void startServer();

export default app;
