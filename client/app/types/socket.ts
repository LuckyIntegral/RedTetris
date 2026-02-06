import { Socket as SocketClient } from 'socket.io-client';

export type Intent =
  | { type: 'move'; dir: 'left' | 'right' }
  | { type: 'rotate' }
  | { type: 'soft' }
  | { type: 'hard' }
  | { type: 'hold' };

export interface Piece {
  type: string;
  x: number;
  y: number;
  rotation: number;
}

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
  name: string;
  spectrum?: number[];
}

export interface GameState {
  status: 'waiting' | 'running' | 'finished';
  tick: number;
  speed: number;
  players: Record<string, PlayerState>;
  winnerId?: string | null;
  hostId?: string | null;
}

export interface ClientToServerEvents {
  create: () => Promise<void> | void;
  join: (payload: { roomId: string }) => Promise<void> | void;
  start: (payload: { roomId: string }) => void;
  restart: (payload: { roomId: string }) => void;
  intent: (payload: { roomId: string; intent: Intent }) => void;
}

export interface ServerToClientEvents {
  created: (payload: { roomId: string }) => void;
  state: (payload: GameState | { state: GameState; hostId?: string }) => void;
  game_over: (payload: { message: string }) => void;
  join_failed: (payload: { code: string; message: string }) => void;
  start_failed: (payload: { code: string; message: string }) => void;
  restart_failed: (payload: { code: string; message: string }) => void;
  create_failed: (payload: { code: string; message: string }) => void;
  restarted: (payload: { message: string }) => void;
  joined: (payload: { roomId: string }) => void;
  winner: (payload: { message: string }) => void;
  host_changed: (payload: { newHostId: string; message?: string }) => void;
  connect_error: (err: Error) => void;
}

export type Socket = SocketClient<ServerToClientEvents, ClientToServerEvents>;
