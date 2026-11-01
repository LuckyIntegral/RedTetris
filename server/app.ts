import dotenv from 'dotenv';
import path from 'path';

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { GameManager } from './core/GameManager';
import { runMigrations, testConnection } from './db';
import { resolveSession } from './middleware/auth';
import { registerSocketHandlers } from './net/socketHandlers';
import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socketEvents';

import { logDbError, logger } from './utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const app = express();
const server = http.createServer(app);

// Localhost-only CORS origins
const clientPort = process.env.CLIENT_PORT ?? '3001';
const clientUrlsRaw = process.env.CLIENT_URL ?? `http://localhost:${clientPort},http://127.0.0.1:${clientPort}`;
const allowedOrigins = clientUrlsRaw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const io = new IOServer<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>(server, {
  cors: { origin: allowedOrigins, credentials: true },
  // Client messages are tiny JSON objects; the 1 MB default only helps memory-exhaustion attempts
  maxHttpBufferSize: 16 * 1024,
});
const gameManager = new GameManager();

// Only authenticated users may open a socket; game events also re-check socket.data.user
io.use((socket: Socket<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>, next) => {
  const token = socket.handshake.auth?.token as unknown;
  if (typeof token !== 'string' || token === '') {
    logger.info('socket auth: no token provided');
    return next(new Error('Authentication required'));
  }

  // Same check as HTTP requests, so logged-out (revoked) tokens cannot open game sockets
  resolveSession(token)
    .then((user) => {
      if (!user) {
        logger.info('socket auth failed: invalid, expired or revoked token');
        next(new Error('Session expired, please log in again'));
        return;
      }
      socket.data.user = user;
      logger.info('socket authenticated as', user.username);
      next();
    })
    .catch((err: unknown) => {
      logDbError('socket auth', err);
      next(new Error('Authentication unavailable'));
    });
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

// Behind a reverse proxy in production: trust its X-Forwarded-For so rate limits apply per client
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '0', 10);
if (trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}
app.disable('x-powered-by');

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
    },
    credentials: true,
  })
);
// Every request body is a few small JSON fields; larger bodies are rejected with 413
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Swagger Documentation (development only; it maps the whole API for an attacker)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

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

const errorCodes: Record<number, string> = { 400: 'BAD_REQUEST', 403: 'FORBIDDEN', 413: 'PAYLOAD_TOO_LARGE' };

// Errors from middleware (malformed JSON, blocked CORS origin, oversized body) become JSON
// responses; Express's default handler would send HTML with a stack trace outside production
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res
      .status(status)
      .json({ success: false, error: { code: errorCodes[status] ?? 'BAD_REQUEST', message: 'Invalid request' } });
    return;
  }
  logger.error('Unhandled request error', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
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
