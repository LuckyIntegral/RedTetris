import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { AuthResponse, UserRow, sanitizeUser } from '../models/User';
import { generateToken } from '../utils/jwt';
import { logDbError } from '../utils/logger';

const SALT_ROUNDS = 10;
const MAX_USERNAME_LENGTH = 50; // users.username is VARCHAR(50)
const MAX_EMAIL_LENGTH = 60; // users.email is VARCHAR(60)
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 bytes

// Compared against when the username does not exist, so both cases take the same time.
// Generated with SALT_ROUNDS so it keeps matching real hashes if the cost changes.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), SALT_ROUNDS);

// Validation helpers
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email.length <= MAX_EMAIL_LENGTH && emailRegex.test(email);
};

const isValidUsername = (username: string): boolean => {
  return username.length >= 3 && username.length <= MAX_USERNAME_LENGTH && /^[a-zA-Z0-9_-]+$/.test(username);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= MIN_PASSWORD_LENGTH && Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES;
};

const isDuplicateEntry = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ER_DUP_ENTRY';

const userExistsResponse = {
  success: false,
  error: { code: 'USER_EXISTS', message: 'Username or email already exists' },
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = (req.body ?? {}) as Record<string, unknown>;

    // Validation (non-string values such as arrays or objects count as missing)
    if (!isNonEmptyString(username) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      res
        .status(400)
        .json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Username, email, and password are required' },
        });
      return;
    }

    if (!isValidUsername(username)) {
      res
        .status(400)
        .json({
          success: false,
          error: {
            code: 'INVALID_USERNAME',
            message: 'Username must be 3-50 characters and contain only letters, numbers, hyphens, and underscores',
          },
        });
      return;
    }

    if (!isValidEmail(email)) {
      res
        .status(400)
        .json({
          success: false,
          error: { code: 'INVALID_EMAIL', message: `Email must be valid and at most ${MAX_EMAIL_LENGTH} characters` },
        });
      return;
    }

    if (!isValidPassword(password)) {
      res
        .status(400)
        .json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_BYTES} characters long`,
          },
        });
      return;
    }

    // Check if user already exists
    const [existingUsers] = await db.query<UserRow[]>('SELECT id FROM users WHERE username = ? OR email = ?', [
      username,
      email,
    ]);

    if (existingUsers.length > 0) {
      res.status(409).json(userExistsResponse);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user (a concurrent registration can still win the race; the UNIQUE keys catch it below)
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Fetch created user
    const [users] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [result.insertId]);

    if (users.length === 0) {
      throw new Error('Failed to fetch created user');
    }

    const user = users[0];
    const token = generateToken({ userId: user.id, username: user.username, ver: user.token_version });

    const response: AuthResponse = { user: sanitizeUser(user), token };

    res.status(201).json({ success: true, data: response });
  } catch (error: unknown) {
    if (isDuplicateEntry(error)) {
      res.status(409).json(userExistsResponse);
      return;
    }
    logDbError('POST /auth/register', error);
    res
      .status(500)
      .json({ success: false, error: { code: 'REGISTRATION_FAILED', message: 'Failed to register user' } });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = (req.body ?? {}) as Record<string, unknown>;

    // Validation (non-string values such as arrays or objects count as missing)
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      res
        .status(400)
        .json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Username and password are required' } });
      return;
    }

    // Find user (no account can have a longer name, so skip the lookup)
    const [users] =
      username.length <= MAX_USERNAME_LENGTH
        ? await db.query<UserRow[]>('SELECT * FROM users WHERE username = ?', [username])
        : [[] as UserRow[]];

    const user = users[0] as UserRow | undefined;

    // Always perform bcrypt.compare so unknown usernames take as long as wrong passwords
    const isPasswordValid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !isPasswordValid) {
      res
        .status(401)
        .json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
      return;
    }

    // Generate token
    const token = generateToken({ userId: user.id, username: user.username, ver: user.token_version });

    const response: AuthResponse = { user: sanitizeUser(user), token };

    res.json({ success: true, data: response });
  } catch (error: unknown) {
    logDbError('POST /auth/login', error);
    res.status(500).json({ success: false, error: { code: 'LOGIN_FAILED', message: 'Failed to login' } });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is attached by auth middleware
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    const [users] = await db.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({ success: true, data: sanitizeUser(users[0]) });
  } catch (error: unknown) {
    logDbError('GET /auth/profile', error);
    res
      .status(500)
      .json({ success: false, error: { code: 'PROFILE_FETCH_FAILED', message: 'Failed to fetch user profile' } });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user?.userId;

  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    return;
  }

  try {
    // Revokes every token issued so far for this account, on all devices
    await db.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
    res.json({ success: true, data: { message: 'Logged out successfully. All sessions have been signed out.' } });
  } catch (error: unknown) {
    logDbError('POST /auth/logout', error);
    res.status(500).json({ success: false, error: { code: 'LOGOUT_FAILED', message: 'Failed to logout' } });
  }
};
