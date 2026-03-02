import proxyquire from 'proxyquire';
import sinon from 'sinon';

type DBModule = typeof import('../../server/db');

describe('db migrations branches', () => {
  it('skips when no migrations dir', async () => {
    const fakeFs = { stat: sinon.stub().resolves(null) };

    const fakeConn = { query: sinon.stub().resolves([[]]), release: sinon.stub() };

    const fakePool = { getConnection: () => Promise.resolve(fakeConn) };
    const fakeMysql = { createPool: () => fakePool };

    const db = proxyquire<DBModule>('../../server/db', { 'fs/promises': fakeFs, 'mysql2/promise': fakeMysql });
    await db.runMigrations();
    sinon.assert.calledOnce(fakeFs.stat);
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
      release: sinon.stub(),
    };

    const fakePool = { getConnection: () => Promise.resolve(fakeConn) };
    const fakeMysql = { createPool: () => fakePool };

    const db = proxyquire<DBModule>('../../server/db', { 'fs/promises': fakeFs, 'mysql2/promise': fakeMysql });
    await db.runMigrations();
    sinon.assert.called(fakeConn.query);
  });
});
