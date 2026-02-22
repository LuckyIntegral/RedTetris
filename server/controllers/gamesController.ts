import { Response } from 'express';
import db from '../db';
import { AuthRequest } from '../middleware/auth';
import { GameDTO, GameRow } from '../models/Game';
import { logDbError } from '../utils/logger';

export const getUserGames = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    return;
  }

  try {
    const [rows] = await db.query<GameRow[]>(
      `SELECT g.id AS game_id,
              g.started_at AS started_at,
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
          started_at: r.started_at,
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
            player: { id: r.player_id, username: r.username as string, email: r.email as string },
            score: r.score,
            place: r.place,
          },
        ],
      });
    }

    const games = Array.from(gamesMap.values());

    res.json({ success: true, data: games });
  } catch (err: unknown) {
    logDbError('GET /api/games', err);
    res.status(500).json({ success: false, error: { code: 'GAMES_FETCH_FAILED', message: 'Failed to fetch games' } });
  }
};

export default { getUserGames };
