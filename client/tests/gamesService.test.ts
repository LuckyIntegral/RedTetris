import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gamesService } from '~/services/games';

// We need to mock authService.getToken inside the games module
vi.mock('~/services/auth', () => ({
  authService: {
    getToken: vi.fn(() => 'mock-token'),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

describe('gamesService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGames', () => {
    it('fetches paginated games', async () => {
      const mockData = {
        page: 0,
        size: 10,
        totalItems: 1,
        totalPages: 1,
        content: [
          {
            game_id: 1,
            finished_at: '2025-01-01',
            players: [{ player: { id: 1, username: 'user1' }, score: 100, place: 1 }],
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      } as Response);

      const result = await gamesService.getGames(0, 10);
      expect(result.content).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });

    it('throws error on failed fetch', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      } as Response);

      await expect(gamesService.getGames()).rejects.toThrow('Unauthorized');
    });

    it('throws generic error when no message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: {} }),
      } as Response);

      await expect(gamesService.getGames()).rejects.toThrow('Failed to fetch games');
    });
  });

  describe('getAllGames', () => {
    it('fetches all pages of games', async () => {
      const page0 = {
        page: 0,
        size: 100,
        totalItems: 150,
        totalPages: 2,
        content: Array.from({ length: 100 }, (_, i) => ({
          game_id: i,
          finished_at: '2025-01-01',
          players: [],
        })),
      };
      const page1 = {
        page: 1,
        size: 100,
        totalItems: 150,
        totalPages: 2,
        content: Array.from({ length: 50 }, (_, i) => ({
          game_id: 100 + i,
          finished_at: '2025-01-01',
          players: [],
        })),
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: page0 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: page1 }),
        } as Response);

      const result = await gamesService.getAllGames();
      expect(result).toHaveLength(150);
    });

    it('returns single page when totalPages is 1', async () => {
      const page0 = {
        page: 0,
        size: 100,
        totalItems: 3,
        totalPages: 1,
        content: [
          { game_id: 1, finished_at: '2025-01-01', players: [] },
          { game_id: 2, finished_at: '2025-01-01', players: [] },
          { game_id: 3, finished_at: '2025-01-01', players: [] },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: page0 }),
      } as Response);

      const result = await gamesService.getAllGames();
      expect(result).toHaveLength(3);
    });
  });

  describe('computeStats', () => {
    it('returns zeros for empty games array', () => {
      const stats = gamesService.computeStats([], 1);
      expect(stats).toEqual({
        gamesPlayed: 0,
        wins: 0,
        winRate: 0,
        highScore: 0,
        averageScore: 0,
        bestPlace: 0,
      });
    });

    it('computes stats correctly for a single game with a win', () => {
      const games = [
        {
          game_id: 1,
          finished_at: '2025-01-01',
          players: [
            { player: { id: 1, username: 'me' }, score: 500, place: 1 },
            { player: { id: 2, username: 'other' }, score: 200, place: 2 },
          ],
        },
      ];

      const stats = gamesService.computeStats(games, 1);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.wins).toBe(1);
      expect(stats.winRate).toBe(100);
      expect(stats.highScore).toBe(500);
      expect(stats.averageScore).toBe(500);
      expect(stats.bestPlace).toBe(1);
    });

    it('computes stats correctly for multiple games', () => {
      const games = [
        {
          game_id: 1,
          finished_at: '2025-01-01',
          players: [
            { player: { id: 1, username: 'me' }, score: 1000, place: 1 },
            { player: { id: 2, username: 'other' }, score: 200, place: 2 },
          ],
        },
        {
          game_id: 2,
          finished_at: '2025-01-02',
          players: [
            { player: { id: 1, username: 'me' }, score: 300, place: 2 },
            { player: { id: 2, username: 'other' }, score: 500, place: 1 },
          ],
        },
        {
          game_id: 3,
          finished_at: '2025-01-03',
          players: [
            { player: { id: 1, username: 'me' }, score: 200, place: 3 },
            { player: { id: 3, username: 'third' }, score: 400, place: 1 },
          ],
        },
      ];

      const stats = gamesService.computeStats(games, 1);
      expect(stats.gamesPlayed).toBe(3);
      expect(stats.wins).toBe(1);
      expect(stats.winRate).toBe(33); // Math.round(1/3*100)
      expect(stats.highScore).toBe(1000);
      expect(stats.averageScore).toBe(500);
      expect(stats.bestPlace).toBe(1);
    });

    it('handles games where the user is not found in players', () => {
      const games = [
        {
          game_id: 1,
          finished_at: '2025-01-01',
          players: [{ player: { id: 2, username: 'other' }, score: 500, place: 1 }],
        },
      ];

      const stats = gamesService.computeStats(games, 1);
      // gamesPlayed is games.length (1), but no scores found
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.wins).toBe(0);
      expect(stats.highScore).toBe(0);
      expect(stats.bestPlace).toBe(0); // Infinity becomes 0
    });
  });
});
