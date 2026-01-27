import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import db from '../db';
import { AuthResponse, CreateUserDto, LoginDto, UserRow, sanitizeUser } from '../models/User';
import { generateToken } from '../utils/jwt';
import { logDbError } from '../utils/logger';

const SALT_ROUNDS = 10;

// Validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUsername = (username: string): boolean => {
  return username.length >= 3 && username.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(username);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password }: CreateUserDto = req.body;

    // Validation
    if (!username || !email || !password) {
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
      res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'Invalid email format' } });
      return;
    }

    if (!isValidPassword(password)) {
      res
        .status(400)
        .json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 6 characters long' },
        });
      return;
    }

    // Check if user already exists
    const [existingUsers] = await db.query<UserRow[]>('SELECT id FROM users WHERE username = ? OR email = ?', [
      username,
      email,
    ]);

    if (existingUsers.length > 0) {
      res
        .status(409)
        .json({ success: false, error: { code: 'USER_EXISTS', message: 'Username or email already exists' } });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
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
    const token = generateToken({ userId: user.id, username: user.username });

    const response: AuthResponse = { user: sanitizeUser(user), token };

    res.status(201).json({ success: true, data: response });
  } catch (error: unknown) {
    logDbError('POST /auth/register', error);
    res
      .status(500)
      .json({ success: false, error: { code: 'REGISTRATION_FAILED', message: 'Failed to register user' } });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginDto = req.body;

    // Validation
    if (!username || !password) {
      res
        .status(400)
        .json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Username and password are required' } });
      return;
    }

    // Find user
    const [users] = await db.query<UserRow[]>('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      res
        .status(401)
        .json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
      return;
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      res
        .status(401)
        .json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
      return;
    }

    // Generate token
    const token = generateToken({ userId: user.id, username: user.username });

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
    const userId = (req as any).user?.userId;

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

export const logout = (req: Request, res: Response): void => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // by removing the token. This endpoint just confirms the action.
  res.json({
    success: true,
    data: { message: 'Logged out successfully. Please remove the token from client storage.' },
  });
};
