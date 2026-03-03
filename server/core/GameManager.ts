import { randomUUID } from 'crypto';
import { Game } from '../game/Game';
import { Player } from './Player';
import { GAME_MODES } from '../constants';

export class GameManager {
  games = new Map<string, Game>();

  createNewGame(host: Player, mode: GAME_MODES = 'classic'): Game {
    const roomId = this.generateRoomCode();
    const game = new Game(roomId, host, mode);
    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId: string): Game | undefined {
    return this.games.get(roomId);
  }

  removeGame(roomId: string) {
    this.games.delete(roomId);
  }

  private generateRoomCode(): string {
    const gen = () => randomUUID().slice(0, 6).toUpperCase();
    let code = gen();
    while (this.getGame(code)) {
      code = gen();
    }
    return code;
  }
}
