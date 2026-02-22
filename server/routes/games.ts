import { Router } from 'express';
import { getUserGames } from '../controllers/gamesController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/games
 * Returns games the authenticated user participated in.
 */
router.get('/', authenticate, getUserGames);

export default router;
