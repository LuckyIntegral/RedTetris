import dotenv from 'dotenv';
import path from 'path';

import cors from 'cors';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { GameManager } from './core/GameManager';
import db, { runMigrations, testConnection } from './db';
import { registerSocketHandlers } from './net/socketHandlers';
import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socketEvents';

import { verifyToken } from './utils/jwt';
import { logDbError, logger } from './utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

import os from 'os';

const app = express();
const server = http.createServer(app);

// Helper function to get network IPs
function getNetworkIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[name] ?? []) {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        ips.push(networkInterface.address);
      }
    }
  }
  return ips;
}

// Dynamic CORS origins - include current network IPs
const clientPort = process.env.CLIENT_PORT ?? '3001';
const clientUrlsRaw = process.env.CLIENT_URL ?? `http://localhost:${clientPort}`;
const baseOrigins = clientUrlsRaw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Add current network IPs dynamically
const networkIPs = getNetworkIPs();
const dynamicOrigins = networkIPs.map((ip) => `http://${ip}:${clientPort}`);
const allowedOrigins = [...baseOrigins, ...dynamicOrigins];

const io = new IOServer<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
const gameManager = new GameManager();

io.use((socket: Socket<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      logger.info('socket auth: no token provided');
      return next();
    }

    socket.data.user = verifyToken(token);
    logger.info('socket authenticated as', socket.data.user.username);
    return next();
  } catch (err) {
    logger.info('socket auth failed', err);
    return next();
  }
});

registerSocketHandlers(io, gameManager);

const rawPort = process.env.SERVER_PORT;
const SERVER_PORT = (() => {
  if (rawPort === undefined) {
    return 3002;
  }
  const parsedPort = parseInt(rawPort, 10);
  if (Number.isNaN(parsedPort) || !Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    logger.error(`Invalid SERVER_PORT environment variable "${rawPort}". Expected an integer between 1 and 65535.`);
    process.exit(1);
  }
  return parsedPort;
})();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
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
// Games routes
app.use('/api/games', gamesRoutes);

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
    logger.error('Failed to connect to database. Server will not start.');
    process.exit(1);
  }

  try {
    logger.info('Running database migrations...');
    await runMigrations();
    logger.info('Database migrations applied successfully.');
  } catch (error: unknown) {
    logger.error('Failed to apply database migrations:', error);
    process.exit(1);
  }

  server.listen(SERVER_PORT, '0.0.0.0', () => {
    logger.info(`Server (HTTP + Socket.IO) is running on port ${SERVER_PORT}`);
  });
};

startServer().catch((error: unknown) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
