import { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AuthRequest } from './auth';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const tooManyRequests = (message: string) => ({ success: false, error: { code: 'TOO_MANY_REQUESTS', message } });

const clientIp = (req: Request): string => ipKeyGenerator(req.ip ?? '');

// Registration: limited per client IP
export const registerLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  message: tooManyRequests('Too many registration attempts. Please try again after 15 minutes.'),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login, per IP and username: throttles password guessing on one account without
// locking out everyone who shares an address (campus or office NAT)
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  keyGenerator: (req: Request) => {
    const { username } = (req.body ?? {}) as { username?: unknown };
    const name = typeof username === 'string' ? username.toLowerCase().slice(0, 50) : '';
    return `${clientIp(req)}:${name}`;
  },
  message: tooManyRequests('Too many login attempts for this account. Please try again after 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Login, per IP across all usernames: caps credential stuffing from one address
export const loginIpLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 100,
  message: tooManyRequests('Too many login attempts. Please try again after 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter for authenticated routes, keyed by user so shared addresses do not collide
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 300,
  keyGenerator: (req: Request) => {
    const userId = (req as AuthRequest).user?.userId;
    return userId ? `user:${userId}` : clientIp(req);
  },
  message: tooManyRequests('Too many requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});
