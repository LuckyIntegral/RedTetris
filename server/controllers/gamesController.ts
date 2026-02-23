import { Response } from 'express';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { GameDTO, GameRow } from '../models/Game';
import { paginate } from '../routes/pagination';
import { logDbError } from '../utils/logger';

const DEFAULT_PAGE_SIZE = 10;

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
      if (!Number.isNaN(p) && p >= 0) page = p;
    }

    if (typeof sizeParam === 'string' && sizeParam.trim() !== '') {
      const s = Number.parseInt(sizeParam);
      if (!Number.isNaN(s) && s > 0) size = s;
    }

    const [rows] = await db.query<GameRow[]>(
      `SELECT g.id AS game_id,
              g.finished_at AS finished_at,
              gr.player_id AS player_id,
              u.username AS player_username,
              u.email AS player_email,
              gr.score AS score,
              gr.place AS place
       FROM games g
       JOIN game_records gr ON gr.game_id = g.id
       JOIN users u ON gr.player_id = u.id
       WHERE g.id IN (SELECT game_id FROM game_records WHERE player_id = ?)
       ORDER BY g.id DESC, gr.score DESC`,
      [userId]
    );

    const gamesMap = new Map<number, GameDTO>();

    for (const r of rows) {
      if (!gamesMap.has(r.game_id)) {
        gamesMap.set(r.game_id, {
          game_id: r.game_id,
          finished_at: r.finished_at,
          players: [],
        });
      }

      const record: GameDTO = gamesMap.get(r.game_id)!;

      gamesMap.set(r.game_id, {
        ...record,
        players: [
          ...record.players,
          {
            player: { id: r.player_id, username: r.player_username, email: r.player_email },
            score: r.score,
            place: r.place,
          },
        ],
      });
    }

    const games = Array.from(gamesMap.values()).sort((a, b) => b.game_id - a.game_id);

    res.json({ success: true, data: paginate(games, page, size) });
  } catch (err: unknown) {
    logDbError('GET /api/games', err);
    res.status(500).json({ success: false, error: { code: 'GAMES_FETCH_FAILED', message: 'Failed to fetch games' } });
  }
};

export default { getUserGames };
