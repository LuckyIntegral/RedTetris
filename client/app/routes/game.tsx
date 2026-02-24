import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Link } from 'react-router';
import { io } from 'socket.io-client';
import type { Route } from './+types/game';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useAppSelector } from '../store/hooks';
import { authService } from '../services/auth';
import type { GameState, Intent, PlayerState, Socket } from '../types/socket';

const WIDTH = 10;
const HEIGHT = 20;
const CELL = 28;

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Red Tetris — Play' }, { name: 'description', content: 'Play Red Tetris - The Ultimate Multiplayer Tetris Experience!' }];
}

function GameComponent() {
  const { user } = useAppSelector((state) => state.auth);
  const [room, setRoom] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

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

    s.on('connect', () => console.log('connected to server'));

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
      console.log('client: received game_over', info);
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
    const onKey = (e: KeyboardEvent) => {
      if (!playerId || !socketRef.current) return;
      const s = socketRef.current;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'left' } });
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'right' } });
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'rotate' } });
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'soft' } });
      }
      if (e.key === 'Shift') s.emit('intent', { roomId: room, intent: { type: 'hold' } });
      if (e.code === 'Space') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'hard' } });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    // server uses authenticated user for creation
    s.emit('create');
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

  const sendIntent = (intent: Intent) => {
    const s = socketRef.current;
    if (!s || !playerId) return;
    if (state?.status === 'finished' || message) return;
    s.emit('intent', { roomId: room, intent });
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
    if ((state.status === 'finished' || state.winnerId) && state.winnerId === playerId) {
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
          style={{ width: CELL, height: CELL, boxSizing: 'border-box', outline: '1px solid rgba(255,255,255,0.03)' }}
        />
      );
    }
    if (val === -2) {
      return (
        <div
          key={`${x}-${y}`}
          style={{ width: CELL, height: CELL, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', outline: '1px solid rgba(255,255,255,0.03)' }}
        />
      );
    }
    if (val === -1) {
      const penalty = '#4b5563';
      return (
        <div
          key={`${x}-${y}`}
          style={{
            width: CELL,
            height: CELL,
            boxSizing: 'border-box',
            borderRadius: 3,
            background: `linear-gradient(135deg, rgba(255,255,255,0.25) 0%, ${penalty} 40%, ${penalty} 60%, rgba(0,0,0,0.35) 100%)`,
            borderTop: '2px solid rgba(255,255,255,0.3)',
            borderLeft: '2px solid rgba(255,255,255,0.2)',
            borderBottom: '2px solid rgba(0,0,0,0.4)',
            borderRight: '2px solid rgba(0,0,0,0.25)',
            boxShadow: `inset 0 0 6px rgba(255,255,255,0.1), 0 0 4px ${penalty}55`,
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
          borderRadius: 3,
          background: `linear-gradient(135deg, rgba(255,255,255,0.35) 0%, ${color} 40%, ${color} 60%, rgba(0,0,0,0.35) 100%)`,
          borderTop: '2px solid rgba(255,255,255,0.4)',
          borderLeft: '2px solid rgba(255,255,255,0.25)',
          borderBottom: '2px solid rgba(0,0,0,0.4)',
          borderRight: '2px solid rgba(0,0,0,0.25)',
          boxShadow: `inset 0 0 6px rgba(255,255,255,0.15), 0 0 4px ${color}55`,
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
  const PIECE_SHAPES: Record<string, number[][]> = {
    I: [[1, 1, 1, 1]],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  };
  const PIECE_COLORS: Record<string, string> = {
    I: '#06b6d4',
    O: '#f59e0b',
    T: '#8b5cf6',
    S: '#10b981',
    Z: '#ef4444',
    J: '#3b82f6',
    L: '#f97316',
  };

  const PIECE_ID_COLORS: string[] = [
    '#000000', // index 0 unused
    PIECE_COLORS.I,
    PIECE_COLORS.O,
    PIECE_COLORS.T,
    PIECE_COLORS.S,
    PIECE_COLORS.Z,
    PIECE_COLORS.J,
    PIECE_COLORS.L,
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
          isPiece && isAlive ? (
            <div
              key={`op-${x}-${y}`}
              style={{
                width: cell,
                height: cell,
                boxSizing: 'border-box',
                borderRadius: 1,
                background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, ${bg} 50%, rgba(0,0,0,0.3) 100%)`,
                boxShadow: `0 0 2px ${bg}55`,
              }}
            />
          ) : (
            <div
              key={`op-${x}-${y}`}
              style={{ width: cell, height: cell, boxSizing: 'border-box', background: bg }}
            />
          )
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
    const cells: JSX.Element[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const inMat = Boolean(mat && r < mat.length && c < mat[0].length && mat[r][c]);
        cells.push(
          inMat ? (
            <div
              key={`n-${r}-${c}`}
              style={{
                width: size,
                height: size,
                boxSizing: 'border-box',
                borderRadius: 2,
                background: `linear-gradient(135deg, rgba(255,255,255,0.35) 0%, ${color} 40%, ${color} 60%, rgba(0,0,0,0.35) 100%)`,
                borderTop: '2px solid rgba(255,255,255,0.4)',
                borderLeft: '2px solid rgba(255,255,255,0.25)',
                borderBottom: '2px solid rgba(0,0,0,0.4)',
                borderRight: '2px solid rgba(0,0,0,0.25)',
                boxShadow: `inset 0 0 4px rgba(255,255,255,0.15), 0 0 3px ${color}55`,
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
    <main className='min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6' style={{ pointerEvents: 'auto' }}>
      <div className='container mx-auto max-w-7xl'>
        <header className='flex items-center justify-center mb-8 relative'>
          <Link
            to='/'
            className='absolute left-0 z-10 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-lg backdrop-blur-md transition-all duration-200 text-sm flex items-center gap-2'
          >
            ← Back
          </Link>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-white mb-2 drop-shadow-lg'>
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400'>
                RED TETRIS
              </span>
            </h1>
            <p className='text-gray-300'>Play Mode</p>
          </div>
        </header>

        {/* Room Controls */}
        <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl mb-6 max-w-lg mx-auto lg:hidden'>
          <h2 className='text-lg font-semibold text-white mb-3 text-center'>Room Settings</h2>
          
          <div className='space-y-3'>
            <div>
              <label className='block text-xs font-medium text-gray-300 mb-1'>Room Code</label>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className='w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                placeholder='Room code'
              />
            </div>
            
            <div className='flex flex-wrap justify-center gap-2'>
              <button
                onClick={create}
                className='px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200'
              >
                🚀 Create
              </button>
              <button
                onClick={join}
                className='px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200'
              >
                🎯 Join
              </button>
              <button
                onClick={start}
                disabled={!playerId || (hostId ? playerId !== hostId : false)}
                className='px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50'
              >
                ⚡ Start
              </button>
              {state?.status === 'finished' && playerId && hostId && playerId === hostId && (
                <button
                  onClick={() => { setActionLoading(true); socketRef.current?.emit('restart', { roomId: room }); }}
                  className='px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200'
                >
                  🔄 Restart
                </button>
              )}
            </div>

            {/* Status Messages */}
            <div className='space-y-2'>
              {hostId && playerId === hostId && (
                <div className='bg-green-500/20 border border-green-400/30 rounded-lg p-2 text-center'>
                  <span className='text-green-300 text-sm font-medium'>🔑 Room: </span>
                  <span className='text-white text-sm font-bold'>{room}</span>
                </div>
              )}
              {hostName && (
                <div className='bg-blue-500/20 border border-blue-400/30 rounded-lg p-2 text-center'>
                  <span className='text-blue-300 text-sm font-medium'>👑 Host: </span>
                  <span className='text-white text-sm font-semibold'>{hostName}</span>
                  {hostId === playerId || state?.hostId === playerId ? (
                    <span className='text-cyan-300 text-sm font-medium'> (you)</span>
                  ) : null}
                </div>
              )}
              {error && (
                <div className='bg-red-500/20 border border-red-400/30 rounded-lg p-2 text-center'>
                  <span className='text-red-300 text-sm font-medium'>❌ </span>
                  <span className='text-red-200 text-sm'>{error}</span>
                </div>
              )}
              {message && (
                <div className='bg-green-500/20 border border-green-400/30 rounded-lg p-2 text-center'>
                  <span className='text-green-300 text-sm font-medium'>✅ </span>
                  <span className='text-green-200 text-sm'>{message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className='flex gap-6 justify-center items-start min-h-[600px]'>
          {/* Left Side: Room Controls (Desktop) */}
          <div className='hidden lg:block w-64 space-y-4'>
            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl'>
              <h2 className='text-lg font-semibold text-white mb-4 text-center'>Room Settings</h2>
              
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>Room Code</label>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className='w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
                    placeholder='Enter room code'
                  />
                </div>
                
                <div className='space-y-2'>
                  <button
                    onClick={create}
                    className='w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200'
                  >
                    🚀 Create Room
                  </button>
                  <button
                    onClick={join}
                    className='w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200'
                  >
                    🎯 Join Room
                  </button>
                  <button
                    onClick={start}
                    disabled={!playerId || (hostId ? playerId !== hostId : false)}
                    className='w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50'
                  >
                    ⚡ Start Game
                  </button>
                  {state?.status === 'finished' && playerId && hostId && playerId === hostId && (
                    <button
                      onClick={() => { setActionLoading(true); socketRef.current?.emit('restart', { roomId: room }); }}
                      className='w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200'
                    >
                      🔄 Restart
                    </button>
                  )}
                </div>

                {/* Status Messages */}
                <div className='space-y-2'>
                  {hostId && playerId === hostId && (
                    <div className='bg-green-500/20 border border-green-400/30 rounded-lg p-3 text-center'>
                      <span className='text-green-300 font-medium'>🔑 Room Code: </span>
                      <span className='text-white font-bold'>{room}</span>
                    </div>
                  )}
                  {hostName && (
                    <div className='bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 text-center'>
                      <span className='text-blue-300 font-medium'>👑 Host: </span>
                      <span className='text-white font-semibold'>{hostName}</span>
                      {hostId === playerId || state?.hostId === playerId ? (
                        <span className='text-cyan-300 font-medium'> (you)</span>
                      ) : null}
                    </div>
                  )}
                  {error && (
                    <div className='bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-center'>
                      <span className='text-red-300 font-medium'>❌ Error: </span>
                      <span className='text-red-200'>{error}</span>
                    </div>
                  )}
                  {message && (
                    <div className='bg-green-500/20 border border-green-400/30 rounded-lg p-3 text-center'>
                      <span className='text-green-300 font-medium'>✅ </span>
                      <span className='text-green-200'>{message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Game Area */}
          <div className='flex items-start gap-6'>
            {/* Hold Piece */}
            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl'>
              <h3 className='text-sm font-semibold text-white mb-3 text-center'>Hold</h3>
              <div className='bg-black/50 rounded-lg p-3 border-2 border-white/20 flex justify-center items-center' style={{ width: 96, height: 96 }}>
                {renderNextPreview(myView?.holdPiece ?? null, 18)}
              </div>
            </div>

            {/* Main Game Board */}
            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl'>
              <h3 className='text-xl font-semibold text-white mb-4 text-center'>Your Board</h3>
              
              <div className='flex flex-col items-center'>
                <div className='bg-black/50 rounded-lg p-4 border-2 border-white/20'>
                  <div style={{ width: WIDTH * CELL, display: 'grid', gridTemplateColumns: `repeat(${WIDTH}, ${CELL}px)`, gap: 0 }}>
                    {(function rows() {
                      const cells: JSX.Element[] = [];
                      for (let y = 0; y < HEIGHT; y++) {
                        for (let x = 0; x < WIDTH; x++) cells.push(renderCell(x, y));
                      }
                      return cells;
                    })()}
                  </div>
                </div>
                
                <div className='mt-4 bg-white/5 rounded-lg p-3 border border-white/10'>
                  <div className='text-center text-white'>
                    <span className='text-lg font-bold text-cyan-400'>{myView?.score ?? 0}</span>
                    <div className='text-sm text-gray-300'>Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Piece */}
            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl'>
              <h3 className='text-sm font-semibold text-white mb-3 text-center'>Next</h3>
              <div className='bg-black/50 rounded-lg p-3 border-2 border-white/20 flex justify-center items-center' style={{ width: 96, height: 96 }}>
                {renderNextPreview(myView?.nextPiece ?? null, 18)}
              </div>
            </div>
          </div>

          {/* Right Side: Opponents */}
          {opponents.length > 0 && (
            <div className='w-80 space-y-4'>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl'>
                <h3 className='text-lg font-semibold text-white mb-4 text-center'>Opponents</h3>
                <div className='space-y-3'>
                  {opponents.map((op) => (
                    <div key={op.id} className='bg-white/5 rounded-xl p-3 border border-white/10 flex gap-3 items-center justify-between'>
                      {/* Left: Info */}
                      <div className='flex-1 min-w-0 flex flex-col items-start justify-center'>
                        <div className='flex items-center gap-1.5 mb-1'>
                          <div className={`w-2 h-2 rounded-full ${op.isAlive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'}`} />
                          <span className='text-sm font-semibold text-white truncate'>{op.name}</span>
                        </div>
                        {op.isHost && (
                          <span className='text-[10px] text-yellow-400 font-medium mb-1'>👑 Host</span>
                        )}
                        <div className='text-xs text-gray-400 mb-2'>
                          Score: <span className='text-cyan-400 font-semibold'>{op.score}</span>
                        </div>
                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          op.isAlive
                            ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                            : 'bg-red-500/20 text-red-300 border border-red-400/30'
                        }`}>
                          {op.isAlive ? 'ALIVE' : 'DEAD'}
                        </div>
                      </div>
                      {/* Right: Board */}
                      <div className='shrink-0 bg-black/40 rounded-lg p-1.5 border border-white/10 flex justify-center'>
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
