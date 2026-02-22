import { Router } from 'express';
import { getUserGames } from '../controllers/gamesController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: Get games for authenticated user
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of games the user participated in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       started_at:
 *                         type: string
 *                         format: date-time
 *                       finished_at:
 *                         type: string
 *                         format: date-time
 *                       players:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             player_id:
 *                               type: integer
 *                             username:
 *                               type: string
 *                             score:
 *                               type: integer
 *       401:
 *         description: Unauthorized - No or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, getUserGames);

export default router;
