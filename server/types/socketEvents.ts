import { GameState, Intent, PlayerState } from '../game/types';

// TODO: extract types from functions
export interface ClientToServerEvents {
  create: (payload: { username: string }) => Promise<void>;
  join: (payload: { roomId: string; username: string }) => Promise<void>;
  start: (payload: { roomId: string; playerId: string }) => void;
  intent: (payload: { roomId: string; playerId: string; intent: Intent }) => void; // refine intent shape
  ping?: () => void;
}

export interface ServerToClientEvents {
  created: (payload: { playerId: string; roomId: string }) => void;
  state: (payload: {
    status: GameState['status'];
    tick: number;
    players: Record<string, PlayerState>;
    winnerId: string | null;
    hostId: string;
  }) => void;
  game_over: (payload: { message: string }) => void;
  join_failed: (payload: { code: string; message: string }) => void;
  start_failed: (payload: { code: string; message: string }) => void;
  joined: (payload: { playerId: string; roomId: string }) => void;
  winner: (payload: { message: string }) => void;
  host_changed: (payload: { newHostId: string; message?: string }) => void;
  pong?: () => void;
}

export interface SocketData {
  playerId?: string;
  room?: string;
}
