import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Link } from 'react-router';
import { io } from 'socket.io-client';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { GAME_MODES, GAME_SETUP, type GameMode } from '../constants';
import { authService } from '../services/auth';
import type { GameState, PlayerState, Socket } from '../types/socket';
import type { Route } from './+types/game';

const CELL = 28;

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Red Tetris — Play' },
    { name: 'description', content: 'Play Red Tetris - The Ultimate Multiplayer Tetris Experience!' },
  ];
}

function GameComponent() {
  const [room, setRoom] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [state, setState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const modes = useMemo(() => Array.from(GAME_MODES), []);

  const setup = GAME_SETUP[selectedMode];
  const WIDTH = setup.width;
  const HEIGHT = setup.height;

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

  useEffect(() => {
    if (socketRef.current) return; // avoid duplicate sockets in StrictMode / HMR
    const url = (import.meta.env.VITE_SERVER_URL as string) ?? 'http://localhost:3002';
    const token = authService.getToken();
    const s = io(url, { autoConnect: false, auth: { token } }) as unknown as Socket;
    socketRef.current = s;

    s.on('connect', () => {
      // connection established
    });

    // server may emit either a raw state object or { state, hostId } historically.
    s.on('state', (payload: GameState | { state: GameState; hostId?: string }) => {
      setActionLoading(false);
      // normalize payload to `state` object
      const incoming: GameState = 'state' in payload ? payload.state : payload;
      setState(incoming);
      // hostId may be attached at top-level of payload or inside incoming
      const hid = 'hostId' in payload ? (payload.hostId ?? incoming?.hostId ?? null) : (incoming?.hostId ?? null);
      setHostId(hid);
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

  useEffect(() => {
    const DAS_DELAY = 170; // ms before auto-repeat kicks in
    const REPEAT_INTERVAL = 50; // ms between repeated moves
    const held = new Map<string, ReturnType<typeof setTimeout>>();

    const fireIntent = (key: string) => {
      const s = socketRef.current;
      if (!s) return;
      if (key === 'ArrowLeft') s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'left' } });
      else if (key === 'ArrowRight') s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'right' } });
      else if (key === 'ArrowDown') s.emit('intent', { roomId: room, intent: { type: 'soft' } });
    };

    const clearKey = (key: string) => {
      const timer = held.get(key);
      if (timer != null) {
        clearTimeout(timer);
        held.delete(key);
      }
    };

    const repeatableKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown']);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!playerId || !socketRef.current) return;
      const s = socketRef.current;

      if (repeatableKeys.has(e.key)) {
        e.preventDefault();
        if (held.has(e.key)) return; // already held
        fireIntent(e.key); // fire once immediately
        // after DAS_DELAY, start rapid repeat
        const dasTimer = setTimeout(() => {
          const interval = setInterval(() => fireIntent(e.key), REPEAT_INTERVAL);
          held.set(e.key, interval as unknown as ReturnType<typeof setTimeout>);
        }, DAS_DELAY);
        held.set(e.key, dasTimer);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'rotate' } });
      }
      if (e.key === 'Shift') s.emit('intent', { roomId: room, intent: { type: 'hold' } });
      if (e.code === 'Space') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'hard' } });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      clearKey(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      held.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      held.clear();
    };
  }, [playerId, room]);

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
    // server uses authenticated user for creation; include selected game mode
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

  const myView = useMemo<PlayerState | null>(() => {
    if (!state || !playerId) return null;
    return (state.players?.[playerId] ?? null) as PlayerState | null;
  }, [state, playerId]);

  const hostName = useMemo(() => {
    if (!state) return hostId ?? null;
    const hid = hostId ?? state.hostId ?? null;
    return hid ? (state.players?.[hid]?.name ?? hid) : null;
  }, [state, hostId]);

  // show win/lose messages based on state transitions
  const prevAliveRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!state || !playerId) return;
    const alive = Boolean(state.players?.[playerId]?.isAlive);
    const prev = prevAliveRef.current;
    if (prev === true && alive === false) {
      setMessage('You lost');
    }
    if (state.status === 'finished' && state.winnerId === playerId) {
      setMessage('You win');
    }
    prevAliveRef.current = alive;
  }, [state, playerId]);

  const renderCell = (x: number, y: number) => {
    const val = myView?.board?.[y]?.[x] ?? 0;
    if (val === 0) {
      return (
        <div
          key={`${x}-${y}`}
          style={{ width: CELL, height: CELL, boxSizing: 'border-box', outline: '1px solid rgba(255,255,255,0.12)' }}
        />
      );
    }
    if (val === -2) {
      return (
        <div
          key={`${x}-${y}`}
          style={{
            width: CELL,
            height: CELL,
            boxSizing: 'border-box',
            borderRadius: 2,
            background: 'rgba(255,255,255,0.12)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(0,0,0,0.3)',
            borderRight: '1px solid rgba(0,0,0,0.2)',
          }}
        />
      );
    }
    if (val === -1) {
      return (
        <div
          key={`${x}-${y}`}
          style={{
            width: CELL,
            height: CELL,
            boxSizing: 'border-box',
            borderRadius: 2,
            background: '#374151',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(0,0,0,0.3)',
            borderRight: '1px solid rgba(0,0,0,0.2)',
          }}
        />
      );
    }
    const color = PIECE_ID_COLORS[val] ?? '#999';
    return (
      <div
        key={`${x}-${y}`}
        style={{
          width: CELL,
          height: CELL,
          boxSizing: 'border-box',
          borderRadius: 2,
          background: color,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(0,0,0,0.2)',
        }}
      />
    );
  };

  const opponents = useMemo<
    {
      id: string;
      name: string;
      spectrum: number[];
      board: number[][] | null;
      isAlive: boolean;
      score: number;
      isHost: boolean;
    }[]
  >(() => {
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

  // Next-piece shapes (rotation 0) for preview; pad to 4x4 for consistent rendering
  // derive shapes/colors from selected mode's tetrominos when possible
  const tetrominos = setup.tetrominos;
  const pieceKeys = Object.keys(tetrominos);

  const baseClassicColors: Record<string, string> = {
    I: '#0d9488',
    O: '#ca8a04',
    T: '#9333ea',
    S: '#16a34a',
    Z: '#dc2626',
    J: '#2563eb',
    L: '#c2410c',
  };

  const palette = ['#60a5fa', '#f97316', '#e11d48', '#7c3aed', '#059669', '#d946ef', '#facc15', '#06b6d4'];

  const PIECE_SHAPES: Record<string, number[][]> = {};
  const PIECE_COLORS: Record<string, string> = {};
  pieceKeys.forEach((k, idx) => {
    const mats = tetrominos[k];
    PIECE_SHAPES[k] = mats && mats.length ? mats[0] : [[1]];
    PIECE_COLORS[k] = baseClassicColors[k] ?? palette[idx % palette.length];
  });

  const PIECE_ID_COLORS: string[] = [
    '#000000',
    // numeric mapping fallback: map first few pieceKeys to indexes 1..n
    ...pieceKeys.slice(0, 15).map((k) => PIECE_COLORS[k] ?? palette[0]),
  ];

  const renderOpponentBoard = (board: number[][] | null, isAlive: boolean, cell = 4) => {
    const cells: JSX.Element[] = [];
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const val = board?.[y]?.[x] ?? 0;
        let bg = 'transparent';
        if (val === 0) bg = 'transparent';
        else if (val === -2) bg = isAlive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
        else if (val === -1) bg = isAlive ? '#111' : '#444';
        else bg = isAlive ? (PIECE_ID_COLORS[val] ?? '#999') : '#777';

        const isPiece = val > 0;
        cells.push(
          <div
            key={`op-${x}-${y}`}
            style={{
              width: cell,
              height: cell,
              boxSizing: 'border-box',
              borderRadius: isPiece && isAlive ? 1 : 0,
              background: bg,
            }}
          />
        );
      }
    }

    return (
      <div style={{ width: WIDTH * cell, height: HEIGHT * cell, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WIDTH}, ${cell}px)`, gap: 0 }}>{cells}</div>
      </div>
    );
  };

  const renderNextPreview = (type: string | null, size = 12) => {
    const mat = type && PIECE_SHAPES[type] ? PIECE_SHAPES[type] : null;
    const gridSize = 4;
    const color = (type && PIECE_COLORS[type]) ?? '#60a5fa';

    // center the piece matrix within the 4x4 grid
    const matRows = mat ? mat.length : 0;
    const matCols = mat ? mat[0].length : 0;
    const rowOffset = Math.floor((gridSize - matRows) / 2);
    const colOffset = Math.floor((gridSize - matCols) / 2);

    const cells: JSX.Element[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const mr = r - rowOffset;
        const mc = c - colOffset;
        const inMat = Boolean(mat && mr >= 0 && mr < matRows && mc >= 0 && mc < matCols && mat[mr][mc]);
        cells.push(
          inMat ? (
            <div
              key={`n-${r}-${c}`}
              style={{
                width: size,
                height: size,
                boxSizing: 'border-box',
                borderRadius: 2,
                background: color,
                borderTop: '1px solid rgba(255,255,255,0.15)',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(0,0,0,0.3)',
                borderRight: '1px solid rgba(0,0,0,0.2)',
              }}
            />
          ) : (
            <div
              key={`n-${r}-${c}`}
              style={{ width: size, height: size, boxSizing: 'border-box' }}
            />
          )
        );
      }
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, ${size}px)`, gap: 0 }}>{cells}</div>
    );
  };

  return (
    <main
      className='min-h-screen bg-slate-900 p-6'
      style={{ pointerEvents: 'auto' }}
    >
      <div className='container mx-auto max-w-7xl'>
        <header className='flex items-center justify-center mb-8 relative'>
          <Link
            to='/'
            className='absolute left-0 z-10 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2'
          >
            Back
          </Link>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-red-500 mb-2'>RED TETRIS</h1>
            <p className='text-gray-400'>Play Mode</p>
          </div>
        </header>

        {/* Room Controls */}
        <div className='bg-gray-900 rounded-xl p-4 border border-gray-600 mb-6 max-w-lg mx-auto lg:hidden'>
          <h2 className='text-lg font-semibold text-white mb-3 text-center'>Room Settings</h2>

          <div className='space-y-3'>
            <div>
              <label className='block text-xs font-medium text-gray-400 mb-1'>Room Code</label>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={!!playerId}
                className='w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                placeholder='Room code'
              />
            </div>

            <div>
              <label className='block text-xs font-medium text-gray-400 mb-1'>Game Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                disabled={!!playerId}
                className='w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {modes.map((m) => (
                  <option
                    key={m}
                    value={m}
                    className='text-black'
                  >
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex flex-wrap justify-center gap-2'>
              <button
                onClick={create}
                disabled={!!playerId}
                className='px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
              >
                Create
              </button>
              <button
                onClick={join}
                disabled={!!playerId || !room}
                className='px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
              >
                Join
              </button>
              <button
                onClick={start}
                disabled={!playerId || (hostId ? playerId !== hostId : false)}
                className='px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
              >
                Start
              </button>
              {state?.status === 'finished' && playerId && hostId && playerId === hostId && (
                <button
                  onClick={() => {
                    setActionLoading(true);
                    socketRef.current?.emit('restart', { roomId: room });
                  }}
                  className='px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors'
                >
                  Restart
                </button>
              )}
              {playerId && (
                <button
                  onClick={leave}
                  className='px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-semibold rounded-lg transition-colors'
                >
                  Leave
                </button>
              )}
            </div>

            {/* Status Messages */}
            <div className='space-y-2'>
              {hostId && playerId === hostId && (
                <div className='bg-green-900/30 border border-green-800 rounded-lg p-2 text-center'>
                  <span className='text-green-400 text-sm font-medium'>Room: </span>
                  <span className='text-white text-sm font-bold'>{room}</span>
                </div>
              )}
              {hostName && (
                <div className='bg-gray-800 border border-gray-600 rounded-lg p-2 text-center'>
                  <span className='text-gray-400 text-sm font-medium'>Host: </span>
                  <span className='text-white text-sm font-semibold'>{hostName}</span>
                  {hostId === playerId || state?.hostId === playerId ? (
                    <span className='text-gray-400 text-sm font-medium'> (you)</span>
                  ) : null}
                </div>
              )}
              {error && (
                <div className='bg-red-900/30 border border-red-800 rounded-lg p-2 text-center'>
                  <span className='text-red-300 text-sm'>{error}</span>
                </div>
              )}
              {message && (
                <div className='bg-green-900/30 border border-green-800 rounded-lg p-2 text-center'>
                  <span className='text-green-300 text-sm'>{message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className='flex gap-6 justify-center items-start min-h-[600px]'>
          {/* Left Side: Room Controls (Desktop) */}
          <div className='hidden lg:block w-64 space-y-4'>
            <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
              <h2 className='text-lg font-semibold text-white mb-4 text-center'>Room Settings</h2>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-400 mb-2'>Room Code</label>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    disabled={!!playerId}
                    className='w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                    placeholder='Enter room code'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-400 mb-2'>Game Mode</label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                    disabled={!!playerId}
                    className='w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {modes.map((m) => (
                      <option
                        key={m}
                        value={m}
                        className='text-black'
                      >
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='space-y-2'>
                  {!playerId && (
                    <button
                      onClick={create}
                      className='w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors'
                    >
                      Create Room
                    </button>
                  )}
                  {!playerId && (
                    <button
                      onClick={join}
                      disabled={!room}
                      className='w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
                    >
                      Join Room
                    </button>
                  )}
                  <button
                    onClick={start}
                    disabled={!playerId || (hostId ? playerId !== hostId : false)}
                    className='w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
                  >
                    Start Game
                  </button>
                  {state?.status === 'finished' && playerId && hostId && playerId === hostId && (
                    <button
                      onClick={() => {
                        setActionLoading(true);
                        socketRef.current?.emit('restart', { roomId: room });
                      }}
                      className='w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors'
                    >
                      Restart
                    </button>
                  )}
                  {playerId && (
                    <button
                      onClick={leave}
                      className='w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-semibold rounded-lg transition-colors'
                    >
                      Leave Room
                    </button>
                  )}
                </div>

                {/* Status Messages */}
                <div className='space-y-2'>
                  {hostId && playerId === hostId && (
                    <div className='bg-green-900/30 border border-green-800 rounded-lg p-3 text-center'>
                      <span className='text-green-400 font-medium'>Room Code: </span>
                      <span className='text-white font-bold'>{room}</span>
                    </div>
                  )}
                  {hostName && (
                    <div className='bg-gray-800 border border-gray-600 rounded-lg p-3 text-center'>
                      <span className='text-gray-400 font-medium'>Host: </span>
                      <span className='text-white font-semibold'>{hostName}</span>
                      {hostId === playerId || state?.hostId === playerId ? (
                        <span className='text-gray-400 font-medium'> (you)</span>
                      ) : null}
                    </div>
                  )}
                  {error && (
                    <div className='bg-red-900/30 border border-red-800 rounded-lg p-3 text-center'>
                      <span className='text-red-300'>{error}</span>
                    </div>
                  )}
                  {message && (
                    <div className='bg-green-900/30 border border-green-800 rounded-lg p-3 text-center'>
                      <span className='text-green-300'>{message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Game Area */}
          <div className='flex items-start gap-6'>
            {/* Hold Piece */}
            <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
              <h3 className='text-sm font-semibold text-white mb-3 text-center'>Hold</h3>
              <div
                className='bg-gray-900 rounded-lg p-3 border border-gray-600 flex justify-center items-center'
                style={{ width: 4 * CELL + 24, height: 4 * CELL + 24 }}
              >
                {renderNextPreview(myView?.holdPiece ?? null, CELL)}
              </div>
            </div>

            {/* Main Game Board */}
            <div className='bg-gray-900 rounded-xl p-6 border border-gray-600'>
              <h3 className='text-xl font-semibold text-white mb-4 text-center'>Your Board</h3>

              <div className='flex flex-col items-center'>
                <div className='bg-gray-900 rounded-lg p-3 border border-gray-600'>
                  <div
                    style={{
                      width: WIDTH * CELL,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${WIDTH}, ${CELL}px)`,
                      gap: 0,
                    }}
                  >
                    {(function rows() {
                      const cells: JSX.Element[] = [];
                      for (let y = 0; y < HEIGHT; y++) {
                        for (let x = 0; x < WIDTH; x++) cells.push(renderCell(x, y));
                      }
                      return cells;
                    })()}
                  </div>
                </div>

                <div className='mt-4 bg-gray-800 rounded-lg p-3 border border-gray-600'>
                  <div className='text-center text-white'>
                    <span className='text-lg font-bold text-white'>{myView?.score ?? 0}</span>
                    <div className='text-sm text-gray-400'>Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Piece */}
            <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
              <h3 className='text-sm font-semibold text-white mb-3 text-center'>Next</h3>
              <div
                className='bg-gray-900 rounded-lg p-3 border border-gray-600 flex justify-center items-center'
                style={{ width: 4 * CELL + 24, height: 4 * CELL + 24 }}
              >
                {renderNextPreview(myView?.nextPiece ?? null, CELL)}
              </div>
            </div>
          </div>

          {/* Right Side: Opponents */}
          {opponents.length > 0 && (
            <div className='w-80 space-y-4'>
              <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
                <h3 className='text-lg font-semibold text-white mb-4 text-center'>Opponents</h3>
                <div className='space-y-3'>
                  {opponents.map((op) => (
                    <div
                      key={op.id}
                      className='bg-gray-800 rounded-lg p-3 border border-gray-600 flex gap-3 items-center justify-between'
                    >
                      {/* Left: Info */}
                      <div className='flex-1 min-w-0 flex flex-col items-start justify-center'>
                        <div className='flex items-center gap-1.5 mb-1'>
                          <div
                            className={`w-2 h-2 rounded-full ${op.isAlive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'}`}
                          />
                          <span className='text-sm font-semibold text-white truncate'>{op.name}</span>
                        </div>
                        {op.isHost && <span className='text-[10px] text-yellow-400 font-medium mb-1'>Host</span>}
                        <div className='text-xs text-gray-400 mb-2'>
                          Score: <span className='text-white font-semibold'>{op.score}</span>
                        </div>
                        <div
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            op.isAlive
                              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                              : 'bg-red-500/20 text-red-300 border border-red-400/30'
                          }`}
                        >
                          {op.isAlive ? 'ALIVE' : 'DEAD'}
                        </div>
                      </div>
                      {/* Right: Board */}
                      <div className='shrink-0 bg-black rounded-lg p-1.5 border border-gray-600 flex justify-center'>
                        {renderOpponentBoard(op.board ?? null, op.isAlive, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {actionLoading && <LoadingOverlay />}
    </main>
  );
}

export default function GameRoute() {
  return (
    <ProtectedRoute>
      <GameComponent />
    </ProtectedRoute>
  );
}
