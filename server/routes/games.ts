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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Page number (0-based)
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Page size (number of games per page)
 *     responses:
 *       200:
 *         description: Paginated games the user participated in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 0
 *                     size:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 42
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     content:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           game_id:
 *                             type: integer
 *                           started_at:
 *                             type: string
 *                             format: date-time
 *                           finished_at:
 *                             type: string
 *                             format: date-time
 *                           players:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 player:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: integer
 *                                     username:
 *                                       type: string
 *                                     email:
 *                                       type: string
 *                                 score:
 *                                   type: integer
 *                                 place:
 *                                   type: integer
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
