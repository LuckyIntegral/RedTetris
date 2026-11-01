import { expect } from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

type DBModule = typeof import('../../server/db');

function loadDb(fakeFs: object, fakeConn: object) {
  const createPool = sinon.stub().returns({ getConnection: () => Promise.resolve(fakeConn) });
  const createConnection = sinon.stub().resolves(fakeConn);
  const db = proxyquire<DBModule>('../../server/db', {
    'fs/promises': fakeFs,
    'mysql2/promise': { createPool, createConnection },
  });
  return { db, createPool, createConnection };
}

describe('db migrations branches', () => {
  it('skips when no migrations dir', async () => {
    const fakeFs = { stat: sinon.stub().resolves(null) };
    const fakeConn = { query: sinon.stub().resolves([[]]), end: sinon.stub().resolves() };

    const { db, createConnection } = loadDb(fakeFs, fakeConn);
    await db.runMigrations();
    sinon.assert.calledOnce(fakeFs.stat);
    sinon.assert.notCalled(createConnection);
  });

  it('applies migrations when files exist and not applied', async () => {
    const fakeFs = {
      stat: sinon.stub().resolves({ isDirectory: () => true }),
      readdir: sinon.stub().resolves(['001.sql']),
      readFile: sinon.stub().resolves('CREATE TABLE foo();'),
    };

    const fakeConn = {
      query: sinon.stub().callsFake((sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT 1 FROM migrations')) {
          return [[]];
        }
        return [];
      }),
      end: sinon.stub().resolves(),
    };

    const { db } = loadDb(fakeFs, fakeConn);
    await db.runMigrations();
    sinon.assert.calledWith(fakeConn.query, 'CREATE TABLE foo();');
    sinon.assert.calledOnce(fakeConn.end);
  });

  it('rethrows when a migration fails so the server does not start half-migrated', async () => {
    const fakeFs = {
      stat: sinon.stub().resolves({ isDirectory: () => true }),
      readdir: sinon.stub().resolves(['001.sql']),
      readFile: sinon.stub().resolves('BROKEN SQL;'),
    };
    const fakeConn = {
      query: sinon.stub().callsFake((sql: string) => {
        if (sql.includes('SELECT 1 FROM migrations')) return [[]];
        if (sql === 'BROKEN SQL;') throw new Error('syntax error');
        return [];
      }),
      end: sinon.stub().resolves(),
    };

    const { db } = loadDb(fakeFs, fakeConn);
    let caught: unknown;
    try {
      await db.runMigrations();
    } catch (err) {
      caught = err;
    }
    expect(caught).to.be.instanceOf(Error);
    sinon.assert.calledOnce(fakeConn.end);
  });

  it('allows multiple statements only on the migration connection', async () => {
    const fakeFs = {
      stat: sinon.stub().resolves({ isDirectory: () => true }),
      readdir: sinon.stub().resolves(['001.sql']),
      readFile: sinon.stub().resolves('SELECT 1;'),
    };
    const fakeConn = { query: sinon.stub().resolves([[]]), end: sinon.stub().resolves() };

    const { db, createPool, createConnection } = loadDb(fakeFs, fakeConn);
    await db.runMigrations();

    const poolOptions = createPool.firstCall.args[0] as Record<string, unknown>;
    expect(poolOptions.multipleStatements).to.not.equal(true);
    expect(poolOptions.stringifyObjects).to.equal(true);
    expect((createConnection.firstCall.args[0] as Record<string, unknown>).multipleStatements).to.equal(true);
  });
});
