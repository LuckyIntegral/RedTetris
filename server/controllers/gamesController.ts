import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { GameDTO, GameRow } from '../models/Game';
import { PaginationResult } from '../types/pagination';
import { logDbError } from '../utils/logger';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 100_000;

interface CountRow extends RowDataPacket {
  total: number;
}

interface GameIdRow extends RowDataPacket {
  game_id: number;
}

export const getUserGames = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    return;
  }

  try {
    const pageParam = req.query.page;
    const sizeParam = req.query.size;

    let page = 0;
    let size = DEFAULT_PAGE_SIZE;

    if (typeof pageParam === 'string' && pageParam.trim() !== '') {
      const p = Number.parseInt(pageParam);
      if (!Number.isNaN(p) && p >= 0) page = Math.min(p, MAX_PAGE);
    }

    if (typeof sizeParam === 'string' && sizeParam.trim() !== '') {
      const s = Number.parseInt(sizeParam);
      if (!Number.isNaN(s) && s > 0) size = Math.min(s, MAX_PAGE_SIZE);
    }

    // Paginate in SQL: only the requested page of games is loaded, however long the history gets
    const [[{ total }]] = await db.query<CountRow[]>(
      'SELECT COUNT(DISTINCT game_id) AS total FROM game_records WHERE player_id = ?',
      [userId]
    );
    const totalItems = Number(total);

    const [idRows] = await db.query<GameIdRow[]>(
      'SELECT DISTINCT game_id FROM game_records WHERE player_id = ? ORDER BY game_id DESC LIMIT ? OFFSET ?',
      [userId, size, page * size]
    );

    const result: PaginationResult<GameDTO> = {
      page,
      size,
      totalItems,
      totalPages: Math.ceil(totalItems / size),
      content: [],
    };

    if (idRows.length === 0) {
      res.json({ success: true, data: result });
      return;
    }

    const [rows] = await db.query<GameRow[]>(
      `SELECT g.id AS game_id,
              g.finished_at AS finished_at,
              gr.player_id AS player_id,
              u.username AS player_username,
              gr.score AS score,
              gr.place AS place
       FROM games g
       JOIN game_records gr ON gr.game_id = g.id
       JOIN users u ON gr.player_id = u.id
       WHERE g.id IN (?)
       ORDER BY g.id DESC, gr.score DESC`,
      [idRows.map((r) => r.game_id)]
    );

    const gamesMap = new Map<number, GameDTO>();

    for (const r of rows) {
      if (!gamesMap.has(r.game_id)) {
        gamesMap.set(r.game_id, { game_id: r.game_id, finished_at: r.finished_at, players: [] });
      }

      const record: GameDTO = gamesMap.get(r.game_id)!;
      record.players.push({ player: { id: r.player_id, username: r.player_username }, score: r.score, place: r.place });
    }

    result.content = Array.from(gamesMap.values()).sort((a, b) => b.game_id - a.game_id);

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    logDbError('GET /api/games', err);
    res.status(500).json({ success: false, error: { code: 'GAMES_FETCH_FAILED', message: 'Failed to fetch games' } });
  }
};

export default { getUserGames };
