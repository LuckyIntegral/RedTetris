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
  | { type: 'hard' }
  | { type: 'hold' };

export interface PlayerState {
  board: number[][];
  activePiece: Piece | null;
  nextPiece: string | null;
  piecesPlaced: number;
  speed: number;
  holdPiece: string | null;
  holdLocked: boolean;
  score: number;
  isAlive: boolean;
  diedAt: Date | null;
  name: string;
}

export interface GameState {
  status: 'waiting' | 'running' | 'finished';
  tick: number;
  speed: number;
  playerStates: Record<string, PlayerState>;
  initialPlayerCount: number;
}
