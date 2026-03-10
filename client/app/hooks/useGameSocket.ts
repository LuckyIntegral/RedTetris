import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { GAME_MODES, GAME_SETUP, type GameMode } from '../constants';
import { authService } from '../services/auth';
import type { GameState, PlayerState, Socket } from '../types/socket';

export interface UseGameSocketReturn {
  /* state */
  room: string;
  setRoom: (v: string) => void;
  playerId: string | null;
  selectedMode: GameMode;
  setSelectedMode: (m: GameMode) => void;
  state: GameState | null;
  hostId: string | null;
  error: string | null;
  message: string | null;
  actionLoading: boolean;
  myView: PlayerState | null;
  hostName: string | null;
  opponents: OpponentInfo[];
  join: () => void;
  create: () => void;
  start: () => void;
  leave: () => void;
  restart: () => void;
  socketRef: React.RefObject<Socket | null>;
}

export interface OpponentInfo {
  id: string;
  name: string;
  spectrum: number[];
  board: number[][] | null;
  isAlive: boolean;
  score: number;
  isHost: boolean;
}

export function useGameSocket(): UseGameSocketReturn {
  const [room, setRoom] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [state, setState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const setup = GAME_SETUP[selectedMode];
  const WIDTH = setup.width;
  const HEIGHT = setup.height;

  /* socket setup */
  useEffect(() => {
    if (socketRef.current) return;
    const url = (import.meta.env.VITE_SERVER_URL as string) ?? 'http://localhost:3002';
    const token = authService.getToken();
    const s = io(url, { autoConnect: false, auth: { token } }) as unknown as Socket;
    socketRef.current = s;

    s.on('connect', () => {
      /* connected */
    });

    s.on('state', (payload: GameState) => {
      setActionLoading(false);
      setState(payload);
      setHostId(payload.hostId ?? null);
      const m = payload.mode;
      if (m && (GAME_MODES as readonly string[]).includes(m)) {
        setSelectedMode(m as GameMode);
      }
    });

    s.on('joined', async (info: { roomId?: string }) => {
      setActionLoading(false);
      setRoom(info.roomId ?? room);
      try {
        const profile = await authService.getProfile();
        setPlayerId(String(profile.id));
      } catch (err) {
        console.warn('failed to fetch profile after join', err);
      }
      setError(null);
    });

    s.on('created', async (info: { roomId?: string }) => {
      setActionLoading(false);
      setRoom(info.roomId ?? room);
      try {
        const profile = await authService.getProfile();
        setPlayerId(String(profile.id));
      } catch (err) {
        console.warn('failed to fetch profile after create', err);
      }
      setError(null);
    });

    s.on('host_changed', (info: { newHostId?: string; message?: string }) => {
      setHostId(info?.newHostId ?? null);
      if (info?.message) setMessage(info.message);
    });

    s.on('restarted', (info: { message?: string }) => {
      setActionLoading(false);
      if (info?.message) setMessage(info.message);
    });

    s.on('restart_failed', (info: { code?: string; message?: string; reason?: string }) => {
      setActionLoading(false);
      setError(info?.message ?? info?.reason ?? 'RESTART_FAILED');
    });

    s.on('game_over', (info: { message?: string }) => {
      setMessage(info?.message ?? 'game over');
    });

    s.on('winner', (info: { message?: string }) => {
      console.log('client: received winner', info);
      setMessage(info?.message ?? 'YOU WIN');
    });

    s.on('create_failed', (info: { code?: string; message?: string }) => {
      setActionLoading(false);
      setError(info?.message ?? info?.code ?? 'CREATE_FAILED');
    });

    s.on('join_failed', (info: { code?: string; message?: string }) => {
      setActionLoading(false);
      setError(info?.message ?? info?.code ?? 'JOIN_FAILED');
    });

    s.on('start_failed', (info: { code?: string; message?: string }) => {
      setActionLoading(false);
      setError(info?.message ?? info?.code ?? 'START_FAILED');
    });

    s.on('connect_error', (err: Error | string) => {
      setActionLoading(false);
      if (typeof err === 'string') setError(err);
      else setError(err?.message ?? String(err));
    });

    return () => {
      s.off();
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* win / lose detection */
  const prevAliveRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!state || !playerId) return;
    const alive = Boolean(state.players?.[playerId]?.isAlive);
    const prev = prevAliveRef.current;
    if (prev === true && alive === false) setMessage('You lost');
    if (state.status === 'finished' && state.winnerId === playerId) setMessage('You win');
    prevAliveRef.current = alive;
  }, [state, playerId]);

  /* actions */
  const join = () => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) s.connect();
    setActionLoading(true);
    s.emit('join', { roomId: room });
  };

  const create = () => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) s.connect();
    setActionLoading(true);
    s.emit('create', { mode: selectedMode });
    setError(null);
  };

  const start = () => {
    const s = socketRef.current;
    if (!s || !playerId) return;
    if (hostId && playerId !== hostId) {
      setError('ONLY_HOST_CAN_START');
      return;
    }
    setActionLoading(true);
    s.emit('start', { roomId: room });
  };

  const leave = () => {
    const s = socketRef.current;
    if (!s) return;
    s.disconnect();
    setPlayerId(null);
    setState(null);
    setHostId(null);
    setMessage(null);
    setError(null);
    setRoom('');
  };

  const restart = () => {
    setActionLoading(true);
    socketRef.current?.emit('restart', { roomId: room });
  };

  /* derived data */
  const myView = useMemo<PlayerState | null>(() => {
    if (!state || !playerId) return null;
    return (state.players?.[playerId] ?? null) as PlayerState | null;
  }, [state, playerId]);

  const hostName = useMemo(() => {
    if (!state) return hostId ?? null;
    const hid = hostId ?? state.hostId ?? null;
    return hid ? (state.players?.[hid]?.name ?? hid) : null;
  }, [state, hostId]);

  const computeSpectrumFromBoard = (board: number[][]): number[] => {
    const cols = Array.from({ length: WIDTH }, () => 0);
    for (let x = 0; x < WIDTH; x++) {
      let h = 0;
      for (let y = 0; y < HEIGHT; y++) {
        if (board[y]?.[x] || board[y]?.[x] === -1) {
          h = HEIGHT - y;
          break;
        }
      }
      cols[x] = h;
    }
    return cols;
  };

  const opponents = useMemo<OpponentInfo[]>(() => {
    if (!state || !playerId) return [];
    const entries = Object.entries(state.players ?? ({} as Record<string, PlayerState>));
    return entries
      .filter(([id]) => id !== playerId)
      .map(([id, p]) => {
        const board = p?.board ?? null;
        const spectrum = Array.isArray(p?.spectrum)
          ? p.spectrum
          : board
            ? computeSpectrumFromBoard(board)
            : Array.from({ length: WIDTH }, () => 0);

        return {
          id,
          name: p.name ?? id,
          spectrum,
          board,
          isAlive: Boolean(p.isAlive),
          score: p?.score ?? 0,
          isHost: id === (hostId ?? state.hostId),
        };
      });
  }, [state, playerId]);

  return {
    room,
    setRoom,
    playerId,
    selectedMode,
    setSelectedMode,
    state,
    hostId,
    error,
    message,
    actionLoading,
    myView,
    hostName,
    opponents,
    join,
    create,
    start,
    leave,
    restart,
    socketRef,
  };
}
