import { expect } from 'chai';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import proxyquire from 'proxyquire';

import { login, logout, register } from '../controllers/authController';
import db from '../db';
import { AuthRequest, resolveSession } from '../middleware/auth';
import { generateToken, verifyToken } from '../utils/jwt';

interface FakeRes {
  statusCode: number;
  body: { success: boolean; data?: { token?: string }; error?: { code: string } };
  status: (code: number) => FakeRes;
  json: (body: FakeRes['body']) => FakeRes;
}

const fakeRes = (): FakeRes => {
  const res: FakeRes = {
    statusCode: 200,
    body: { success: false },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
  };
  return res;
};

const call = async (handler: (req: Request, res: Response) => Promise<void>, body: unknown, user?: object) => {
  const res = fakeRes();
  await handler({ body, user } as unknown as Request, res as unknown as Response);
  return res;
};

const validUser = { username: 'alice', email: 'alice@example.com', password: 'correct-horse' };

describe('auth: input validation', () => {
  it('rejects non-string fields instead of passing them to SQL or bcrypt', async () => {
    for (const body of [
      { ...validUser, username: ['alice'] },
      { ...validUser, password: { $gt: '' } },
      { ...validUser, email: ['a@b.c'] },
      undefined,
    ]) {
      const res = await call(register, body);
      expect(res.statusCode).to.equal(400);
      expect(res.body.error?.code).to.equal('MISSING_FIELDS');
    }
    const res = await call(login, { username: { username: 1 }, password: 'x' });
    expect(res.statusCode).to.equal(400);
  });

  it('requires 8 to 72 byte passwords', async () => {
    expect((await call(register, { ...validUser, password: 'short12' })).body.error?.code).to.equal('INVALID_PASSWORD');
    expect((await call(register, { ...validUser, password: 'x'.repeat(73) })).body.error?.code).to.equal(
      'INVALID_PASSWORD'
    );
    // 36 two-byte characters = 72 bytes is fine, 37 is over bcrypt's limit
    expect((await call(register, { ...validUser, password: 'é'.repeat(37) })).statusCode).to.equal(400);
    expect((await call(register, { ...validUser, password: 'é'.repeat(36) })).statusCode).to.equal(201);
  });

  it('rejects emails longer than the 60 character column', async () => {
    const email = `${'a'.repeat(50)}@example.com`;
    expect((await call(register, { ...validUser, email })).body.error?.code).to.equal('INVALID_EMAIL');
  });

  it('answers 409, not 500, when two registrations for the same name race', async () => {
    const results = await Promise.all([
      call(register, validUser),
      call(register, { ...validUser, email: 'other@example.com' }),
    ]);
    expect(results.map((r) => r.statusCode).sort()).to.deep.equal([201, 409]);
  });
});

describe('auth: tokens and sessions', () => {
  it('issues a token that resolves to the user', async () => {
    const reg = await call(register, validUser);
    const token = reg.body.data!.token!;
    expect(verifyToken(token)).to.include({ username: 'alice', ver: 0 });
    expect(await resolveSession(token)).to.include({ username: 'alice' });

    const res = await call(login, { username: 'alice', password: validUser.password });
    expect(res.statusCode).to.equal(200);
  });

  it('logout revokes every token issued before it', async () => {
    const reg = await call(register, validUser);
    const token = reg.body.data!.token!;
    const session = await resolveSession(token);

    const res = await call(logout, undefined, session!);
    expect(res.statusCode).to.equal(200);
    expect(await resolveSession(token)).to.equal(null);

    // A fresh login works again
    const again = await call(login, { username: 'alice', password: validUser.password });
    expect(await resolveSession(again.body.data!.token!)).to.include({ username: 'alice' });
  });

  it('rejects tokens of deleted users', async () => {
    const reg = await call(register, validUser);
    await db.query('DELETE FROM users WHERE username = ?', ['alice']);
    expect(await resolveSession(reg.body.data!.token!)).to.equal(null);
  });

  it('rejects unsigned, foreign-key and malformed tokens', async () => {
    const payload = { userId: 1, username: 'alice', ver: 0 };
    const unsigned = jwt.sign(payload, '', { algorithm: 'none' });
    const foreign = jwt.sign(payload, 'some-other-secret-that-is-long-enough!!');
    const noVersion = jwt.sign({ userId: 1, username: 'alice' }, process.env.JWT_SECRET!);
    for (const token of [unsigned, foreign, noVersion, 'not-a-jwt']) {
      expect(() => verifyToken(token)).to.throw('Invalid or expired token');
      expect(await resolveSession(token)).to.equal(null);
    }
    expect(verifyToken(generateToken(payload))).to.deep.equal(payload);
  });

  it('authenticate attaches the user only for a live session', async () => {
    const { authenticate } = await import('../middleware/auth');
    const reg = await call(register, validUser);
    const token = reg.body.data!.token!;

    const run = async (header?: string) => {
      const req = { headers: { authorization: header } } as unknown as AuthRequest;
      const res = fakeRes();
      let nextCalled = false;
      await authenticate(req, res as unknown as Response, () => (nextCalled = true));
      return { req, res, nextCalled };
    };

    const ok = await run(`Bearer ${token}`);
    expect(ok.nextCalled).to.equal(true);
    expect(ok.req.user).to.include({ username: 'alice' });

    expect((await run()).res.statusCode).to.equal(401);
    expect((await run('Bearer nope')).res.statusCode).to.equal(401);
  });
});

describe('auth: JWT secret guard', () => {
  const loadWith = (env: Record<string, string>) => {
    const saved = { NODE_ENV: process.env.NODE_ENV, JWT_SECRET: process.env.JWT_SECRET };
    Object.assign(process.env, env);
    try {
      return proxyquire('../utils/jwt', {}) as unknown;
    } finally {
      Object.assign(process.env, saved);
    }
  };

  it('refuses short or placeholder secrets in production', () => {
    expect(() => loadWith({ NODE_ENV: 'production', JWT_SECRET: 'short' })).to.throw('JWT_SECRET');
    expect(() => loadWith({ NODE_ENV: 'production', JWT_SECRET: `${'a'.repeat(64)}_change_me` })).to.throw(
      'JWT_SECRET'
    );
    expect(() => loadWith({ NODE_ENV: 'production', JWT_SECRET: 'f'.repeat(64) })).not.to.throw();
  });
});
