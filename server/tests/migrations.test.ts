import { expect } from 'chai';
import fs from 'fs/promises';
import { RowDataPacket } from 'mysql2';
import path from 'path';

import db from '../db';

const PUBLIC_DEMO_HASH = '$2b$10$JtWgBljSEhvrFQquc7uJou5Pbl/2rR35YaQwDRdnEw1k7CPMQZwz2';
const migrationsDir = path.resolve(__dirname, '..', 'migrations');

describe('migrations', () => {
  it('do not seed any accounts', async () => {
    for (const file of await fs.readdir(migrationsDir)) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      expect(sql, file).not.to.match(/INSERT\s+(IGNORE\s+)?INTO\s+users/i);
    }
  });

  it('003 deletes demo accounts with the public hash and keeps real ones', async () => {
    await db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?), (?, ?, ?)', [
      'player1',
      'player1@test',
      PUBLIC_DEMO_HASH,
      'player2',
      'player2@example.com',
      '$2b$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ]);

    const sql = await fs.readFile(path.join(migrationsDir, '003_remove_seeded_demo_users.sql'), 'utf8');
    await db.query(sql);

    const [rows] = await db.query<RowDataPacket[]>('SELECT username FROM users ORDER BY username');
    expect(rows.map((r) => r.username as string)).to.deep.equal(['player2']);
  });
});
