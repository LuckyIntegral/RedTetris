import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
const JWT_ALGORITHM = 'HS256';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Anyone who knows the secret can mint tokens for any account, so production refuses short or placeholder secrets
if (process.env.NODE_ENV === 'production' && (JWT_SECRET.length < 32 || /change[_-]?me/i.test(JWT_SECRET))) {
  throw new Error('JWT_SECRET must be at least 32 random characters in production (and not the example value)');
}

export interface JwtPayload {
  userId: number;
  username: string;
  // users.token_version when the token was issued; logout increments it to revoke older tokens
  ver: number;
}

const isJwtPayload = (value: unknown): value is JwtPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const { userId, username, ver } = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(userId) &&
    (userId as number) > 0 &&
    typeof username === 'string' &&
    Number.isSafeInteger(ver) &&
    (ver as number) >= 0
  );
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch {
    throw new Error('Invalid or expired token');
  }
  if (!isJwtPayload(decoded)) {
    throw new Error('Invalid or expired token');
  }
  return { userId: decoded.userId, username: decoded.username, ver: decoded.ver };
};
