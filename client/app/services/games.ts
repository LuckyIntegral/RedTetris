import { authService } from './auth';

const API_URL = (import.meta.env.VITE_SERVER_URL as string) || 'http://localhost:3002';

export interface GamePlayer {
  player: { id: number; username: string };
  score: number;
  place: number;
}

export interface Game {
  game_id: number;
  finished_at: string;
  players: GamePlayer[];
}

export interface PaginatedGames {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  content: Game[];
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  highScore: number;
  averageScore: number;
  bestPlace: number;
}

const createGamesService = () => {
  const getGames = async (page = 0, size = 10): Promise<PaginatedGames> => {
    const token = authService.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/games?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = (await response.json()) as { data: PaginatedGames; error?: { message: string } };
    if (!response.ok) {
      throw new Error(result.error?.message ?? 'Failed to fetch games');
    }

    return result.data;
  };

  const getAllGames = async (): Promise<Game[]> => {
    const firstPage = await getGames(0, 100);
    const all = [...firstPage.content];

    for (let p = 1; p < firstPage.totalPages; p++) {
      const page = await getGames(p, 100);
      all.push(...page.content);
    }

    return all;
  };

  const computeStats = (games: Game[], userId: number): UserStats => {
    if (games.length === 0) {
      return { gamesPlayed: 0, wins: 0, winRate: 0, highScore: 0, averageScore: 0, bestPlace: 0 };
    }

    let wins = 0;
    let highScore = 0;
    let totalScore = 0;
    let bestPlace = Infinity;

    for (const game of games) {
      const myRecord = game.players.find((p) => p.player.id === userId);
      if (!myRecord) continue;

      totalScore += myRecord.score;
      if (myRecord.score > highScore) highScore = myRecord.score;
      if (myRecord.place < bestPlace) bestPlace = myRecord.place;
      if (myRecord.place === 1) wins++;
    }

    return {
      gamesPlayed: games.length,
      wins,
      winRate: games.length > 0 ? Math.round((wins / games.length) * 100) : 0,
      highScore,
      averageScore: games.length > 0 ? Math.round(totalScore / games.length) : 0,
      bestPlace: bestPlace === Infinity ? 0 : bestPlace,
    };
  };

  return { getGames, getAllGames, computeStats };
};

export const gamesService = createGamesService();
