export interface Piece {
  type: string;
  x: number;
  y: number;
  rotation: number;
}

export type Intent = { type: 'move'; dir: 'left' | 'right' } | { type: 'rotate' } | { type: 'soft' } | { type: 'hard' };

export interface PlayerState {
  board: number[][];
  activePiece: Piece | null;
  nextQueue: string[];
  isAlive: boolean;
  spectrum: number[];
  name?: string;
}

export interface GameState {
  status: 'waiting' | 'running' | 'finished';
  tick: number;
  sharedQueue: string[];
  // pointer into sharedQueue so all players receive the same next piece
  sharedIndex: number;
  players: Record<string, PlayerState>;
}
