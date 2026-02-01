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
  nextPiece: string | null;
  piecesPlaced: number; // number of pieces placed so far
  isAlive: boolean;
  spectrum: number[]; // TODO: delete probably
  name: string;
}

export interface GameState {
  status: 'waiting' | 'running' | 'finished';
  tick: number;
  playerStates: Record<string, PlayerState>;
}
