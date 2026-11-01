import { expect } from 'chai';
import { Response } from 'express';
import { ResultSetHeader } from 'mysql2';

import { getUserGames } from '../controllers/gamesController';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { GameDTO } from '../models/Game';
import { PaginationResult } from '../types/pagination';

const addUser = async (username: string) => {
  const [res] = await db.query<ResultSetHeader>('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [
    username,
    `${username}@example.com`,
    'x',
  ]);
  return res.insertId;
};

const addGame = async (players: { id: number; score: number }[]) => {
  const [res] = await db.query<ResultSetHeader>('INSERT INTO games (finished_at) VALUES (NOW())');
  for (const [i, p] of players.entries()) {
    await db.query('INSERT INTO game_records (game_id, player_id, score, place) VALUES (?, ?, ?, ?)', [
      res.insertId,
      p.id,
      p.score,
      i + 1,
    ]);
  }
  return res.insertId;
};

const fetchGames = async (userId: number, query: Record<string, string> = {}) => {
  let body: { data: PaginationResult<GameDTO> } | undefined;
  const res = { status: () => res, json: (b: typeof body) => (body = b) } as unknown as Response;
  await getUserGames({ user: { userId, username: 'u' }, query } as unknown as AuthRequest, res);
  return body!.data;
};

describe('GET /api/games pagination', () => {
  it('pages through only the games the user played, newest first, with every player', async () => {
    const alice = await addUser('alice');
    const bob = await addUser('bob');
    const ids = [];
    for (let i = 0; i < 5; i++)
      ids.push(
        await addGame([
          { id: alice, score: i },
          { id: bob, score: 10 },
        ])
      );
    await addGame([{ id: bob, score: 1 }]); // bob only

    const first = await fetchGames(alice, { page: '0', size: '2' });
    expect(first).to.include({ page: 0, size: 2, totalItems: 5, totalPages: 3 });
    expect(first.content.map((g) => g.game_id)).to.deep.equal([ids[4], ids[3]]);
    expect(first.content[0].players.map((p) => p.player.username)).to.deep.equal(['bob', 'alice']);

    const last = await fetchGames(alice, { page: '2', size: '2' });
    expect(last.content.map((g) => g.game_id)).to.deep.equal([ids[0]]);

    expect((await fetchGames(alice, { page: '3', size: '2' })).content).to.deep.equal([]);
  });

  it('caps the page size and page number', async () => {
    const alice = await addUser('alice');
    await addGame([{ id: alice, score: 1 }]);

    expect(await fetchGames(alice, { size: '1000000' })).to.include({ size: 100, totalItems: 1 });
    expect(await fetchGames(alice, { page: '99999999999' })).to.include({ page: 100_000 });
    expect(await fetchGames(alice, { page: '-1', size: 'abc' })).to.include({ page: 0, size: 10 });
  });
});
