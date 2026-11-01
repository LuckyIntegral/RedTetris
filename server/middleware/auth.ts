import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../db';
import { verifyToken } from '../utils/jwt';
import { logDbError } from '../utils/logger';

export interface SessionUser {
  userId: number;
  username: string;
}

export interface AuthRequest extends Request {
  user?: SessionUser;
}

interface SessionRow extends RowDataPacket {
  username: string;
  token_version: number;
}

// Resolves a bearer token to its user, or null if the token is invalid, expired, revoked or the user is gone
export const resolveSession = async (token: string): Promise<SessionUser | null> => {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }

  const [rows] = await db.query<SessionRow[]>('SELECT username, token_version FROM users WHERE id = ?', [
    payload.userId,
  ]);
  const user = rows[0];
  // A missing user or a bumped token_version (logout) both revoke the token
  if (user?.token_version !== payload.ver) {
    return null;
  }
  return { userId: payload.userId, username: user.username };
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'No authentication token provided' } });
    return;
  }

  try {
    const user = await resolveSession(authHeader.substring(7)); // Remove 'Bearer ' prefix
    if (!user) {
      res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
      return;
    }
    req.user = user;
    next();
  } catch (error: unknown) {
    logDbError('authenticate', error);
    res.status(500).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Failed to verify session' } });
  }
};
