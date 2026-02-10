import { GameState, Intent, PlayerState } from '../game/types';
import { JwtPayload } from '../utils/jwt';

export interface ClientToServerEvents {
  create: () => Promise<void>;
  join: (payload: { roomId: string }) => Promise<void>;
  start: (payload: { roomId: string }) => void;
  restart: (payload: { roomId: string }) => void;
  intent: (payload: { roomId: string; intent: Intent }) => void;
}

export interface ServerToClientEvents {
  created: (payload: { roomId: string }) => void;
  state: (payload: {
    status: GameState['status'];
    tick: number;
    speed: number;
    players: Record<string, PlayerState>;
    winnerId: string | null;
    hostId: string;
  }) => void;
  game_over: (payload: { message: string }) => void;
  join_failed: (payload: { code: string; message: string }) => void;
  start_failed: (payload: { code: string; message: string }) => void;
  restart_failed: (payload: { code: string; message: string }) => void;
  create_failed: (payload: { code: string; message: string }) => void;
  restarted: (payload: { message: string }) => void;
  joined: (payload: { roomId: string }) => void;
  winner: (payload: { message: string }) => void;
  host_changed: (payload: { newHostId: string; message?: string }) => void;
}

export interface SocketData {
  playerId?: string;
  room?: string;
  user?: JwtPayload;
}
