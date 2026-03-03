import { GameMode } from '../constants';
import { Player } from '../core/Player';
import { GameEngine } from './GameEngine';
import { GameState, Intent } from './types';

export class Game {
  id: string;
  players = new Map<string, Player>();
  state: GameState;
  engine: GameEngine;
  hostId: string;
  mode: GameMode;

  constructor(id: string, host: Player, mode: GameMode = 'classic') {
    this.id = id;
    this.hostId = host.id;
    this.players.set(host.id, host);
    this.mode = mode;
    this.engine = new GameEngine(id, mode);
    this.state = this.engine.createInitialState([host.id]);
    // ensure player name is present in state
    if (this.state.playerStates[host.id]) {
      this.state.playerStates[host.id].name = host.name;
    }
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
    if (this.state.playerStates[player.id]) {
      this.state.playerStates[player.id].name = player.name;
    }
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
