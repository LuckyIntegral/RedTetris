import { Game } from '../game/Game';
import { Player } from './Player';

export class GameManager {
  games = new Map<string, Game>();

  createGame(roomId: string, host: Player) {
    const game = new Game(roomId, host);
    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId: string) {
    return this.games.get(roomId);
  }

  removeGame(roomId: string) {
    this.games.delete(roomId);
  }
}
