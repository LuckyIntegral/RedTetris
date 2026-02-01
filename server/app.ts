import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import cors from 'cors';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { GameManager } from './core/GameManager';
import db, { testConnection } from './db';
import { registerSocketHandlers } from './net/socketHandlers';
import authRoutes from './routes/auth';
import { logDbError, logger } from './utils/logger';

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:3000' } });
const gameManager = new GameManager();

registerSocketHandlers(io, gameManager);

const rawPort = process.env.PORT;
const PORT = (() => {
  if (rawPort === undefined) {
    return 3001;
  }
  const parsedPort = parseInt(rawPort, 10);
  if (Number.isNaN(parsedPort) || !Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    logger.error(`Invalid PORT environment variable "${rawPort}". Expected an integer between 1 and 65535.`);
    process.exit(1);
  }
  return parsedPort;
})();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: API welcome message
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to Red Tetris API
 */
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Red Tetris API' });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 database:
 *                   type: string
 *                   example: connected
 */
app.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.json({ status: 'ok', database: dbConnected ? 'connected' : 'disconnected' });
});

// Auth routes
app.use('/api/auth', authRoutes);

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
    logger.error('❌ Failed to connect to database. Server will not start.');
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info(`🚀 Server (HTTP + Socket.IO) is running on port ${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
