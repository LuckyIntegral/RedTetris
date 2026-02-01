export interface Piece {
  type: string;
  x: number;
  y: number;
  rotation: number;
}

export type Intent =
  | { type: 'move'; dir: 'left' | 'right' }
  | { type: 'rotate' }
  | { type: 'soft' }
  | { type: 'hard' };

export interface PlayerState {
  board: number[][];
  activePiece: Piece | null;
  nextQueue: string[]; // TODO: delete as well later
  isAlive: boolean;
  spectrum: number[]; // TODO: delete probably
  name: string;
}

export interface GameState {
  status: 'waiting' | 'running' | 'finished';
  tick: number;
  sharedQueue: string[]; // TODO: seed it here once with 50+-, and then return pieces from it
  // pointer into sharedQueue so all players receive the same next piece
  sharedIndex: number; // TODO: delete as well later
  playerStates: Record<string, PlayerState>;
}
