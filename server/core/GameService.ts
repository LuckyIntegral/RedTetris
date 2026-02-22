import { ResultSetHeader } from 'mysql2';
import db from '../db';
import { Game } from '../game/Game';
import { logger } from '../utils/logger';

export class GameService {
  async saveFinishedGame(game: Game): Promise<number> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const finishedAt = new Date();
      const [res] = await conn.query<ResultSetHeader>('INSERT INTO games (finished_at) VALUES (?)', [finishedAt]);
      logger.info('Inserted game with info on insert:', res);

      const gameId = res.insertId;

      const playerScores = game
        .getPlayers()
        .map((p) => ({
          id: p.id,
          score: game.getState().playerStates[p.id].score,
          diedAt: game.getState().playerStates[p.id].diedAt ?? new Date(),
        }));
      playerScores.sort((a, b) => b.diedAt.getTime() - a.diedAt.getTime() || b.score - a.score);

      for (const [index, ps] of playerScores.entries()) {
        await conn.query('INSERT INTO game_records (game_id, player_id, score, place) VALUES (?, ?, ?, ?)', [
          gameId,
          ps.id,
          ps.score,
          index + 1,
        ]);
      }

      await conn.commit();
      return gameId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default new GameService();
