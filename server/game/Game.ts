import { Player } from '../core/Player';
import { GameEngine } from './GameEngine';
import { GameState, Intent } from './GameState';

export class Game {
  id: string;
  players = new Map<string, Player>();
  state: GameState;
  engine: GameEngine;
  hostId: string;

  constructor(id: string, host: Player) {
    this.id = id;
    this.hostId = host.id;
    this.players.set(host.id, host);
    this.engine = new GameEngine(id);
    this.state = this.engine.createInitialState([host.id]);
  }

  getState(): GameState {
    return this.state;
  }

  addPlayer(player: Player) {
    if (this.state.status !== 'waiting') {
      return;
    }
    this.players.set(player.id, player);
    this.state = this.engine.addPlayer(this.state, player.id);
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  applyInput(playerId: string, input: Intent) {
    this.state = this.engine.applyInput(this.state, playerId, input);
  }

  tick() {
    this.state = this.engine.tick(this.state);
  }
}
