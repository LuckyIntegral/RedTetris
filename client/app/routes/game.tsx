import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { io } from 'socket.io-client';
import { authService } from '../services/auth';
import type { GameState, Intent, PlayerState, Socket } from '../types/socket';

const WIDTH = 10;
const HEIGHT = 20;
const CELL = 16; // smaller cell size for falling pieces

export function meta() {
  return [{ title: 'Red Tetris — Play' }];
}

export default function GameRoute() {
  const [room, setRoom] = useState('test-room');
  const [name, setName] = useState('alice');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    const url = (import.meta.env.VITE_SERVER_URL as string) ?? 'http://localhost:3001';
    const token = authService.getToken();
    const s = io(url, { autoConnect: false, auth: { token } }) as unknown as Socket;
    socketRef.current = s;

    s.on('connect', () => console.log('connected to server'));

    // server may emit either a raw state object or { state, hostId } historically.
    s.on('state', (payload: GameState | { state: GameState; hostId?: string }) => {
      // normalize payload to `state` object
      const incoming: GameState = 'state' in payload ? payload.state : payload;
      setState(incoming);
      // hostId may be attached at top-level of payload or inside incoming
      const hid = 'hostId' in payload ? (payload.hostId ?? incoming?.hostId ?? null) : (incoming?.hostId ?? null);
      setHostId(hid);
    });

    s.on('joined', async (info: { roomId?: string }) => {
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
      if (info?.message) setMessage(info.message);
    });
    s.on('restart_failed', (info: { code?: string; message?: string; reason?: string }) => {
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
      setError(info?.message ?? info?.code ?? 'CREATE_FAILED');
    });
    s.on('join_failed', (info: { code?: string; message?: string }) => {
      setError(info?.message ?? info?.code ?? 'JOIN_FAILED');
    });
    s.on('start_failed', (info: { code?: string; message?: string }) => {
      setError(info?.message ?? info?.code ?? 'START_FAILED');
    });
    s.on('connect_error', (err: Error | string) => {
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
      if (e.key === 'ArrowLeft') s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'left' } });
      if (e.key === 'ArrowRight') s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'right' } });
      if (e.key === 'ArrowUp') s.emit('intent', { roomId: room, intent: { type: 'rotate' } });
      if (e.key === 'ArrowDown') s.emit('intent', { roomId: room, intent: { type: 'soft' } });
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
    s.emit('join', { roomId: room });
  };

  const create = () => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) s.connect();
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
    const color =
      val == 0
        ? 'bg-transparent'
        : val == -2
          ? 'bg-[rgba(255,255,255,0.06)]'
          : val == -1
            ? 'bg-gray-800'
            : [
                'bg-red-200',
                'bg-green-200',
                'bg-blue-200',
                'bg-yellow-200',
                'bg-purple-200',
                'bg-pink-200',
                'bg-orange-200',
                'bg-gray-200',
                'bg-white-200',
              ][val - 1];
    return (
      <div
        key={`${x}-${y}`}
        style={{ width: CELL, height: CELL, boxSizing: 'border-box', border: '1px solid #222' }}
        className={color}
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

        cells.push(
          <div
            key={`op-${x}-${y}`}
            style={{ width: cell, height: cell, boxSizing: 'border-box', border: '1px solid #222', background: bg }}
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
    const cells: JSX.Element[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const inMat = Boolean(mat && r < mat.length && c < mat[0].length && mat[r][c]);
        const bg = inMat ? color : 'transparent';
        cells.push(
          <div
            key={`n-${r}-${c}`}
            style={{ width: size, height: size, boxSizing: 'border-box', border: '1px solid #222', background: bg }}
          />
        );
      }
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, ${size}px)`, gap: 0 }}>{cells}</div>
    );
  };

  return (
    <main
      className='p-6'
      style={{ pointerEvents: 'auto' }}
    >
      <h1 className='text-2xl mb-4'>Red Tetris — Client</h1>

      <div className='mb-4 space-y-2'>
        <div>
          <label className='mr-2'>Room</label>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>
        <div>
          <label className='mr-2'>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className='space-x-2 mt-2'>
          <button onClick={create}>Create</button>
          <button onClick={join}>Join</button>
          <button
            onClick={start}
            disabled={!playerId || (hostId ? playerId !== hostId : false)}
          >
            Start
          </button>
          {state?.status === 'finished' && playerId && hostId && playerId === hostId && (
            <button onClick={() => socketRef.current?.emit('restart', { roomId: room })}>Restart</button>
          )}
        </div>
        {hostId && playerId === hostId && (
          <div className='mt-2'>
            <strong>Passcode:</strong> {room}
          </div>
        )}
        {hostName && (
          <div className='mt-2'>
            <strong>Host:</strong> {hostName} {hostId === playerId || state?.hostId === playerId ? '(you)' : ''}
          </div>
        )}
        {error && <div className='mt-2 text-red-600'>Error: {error}</div>}
        {message && <div className='mt-2 text-green-600'>Message: {message}</div>}
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div>
          <div style={{ width: 220 }}>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: `repeat(${WIDTH}, 20px)` }}>
              {(function rows() {
                const cells: JSX.Element[] = [];
                for (let y = 0; y < HEIGHT; y++) {
                  for (let x = 0; x < WIDTH; x++) cells.push(renderCell(x, y));
                }
                return cells;
              })()}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Score:</strong> {myView?.score ?? 0}
          </div>
          <div className='mt-2'>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <button
                style={{ zIndex: 20, pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => sendIntent({ type: 'move', dir: 'left' })}
              >
                Left
              </button>
              <button
                style={{ zIndex: 20, pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => sendIntent({ type: 'move', dir: 'right' })}
              >
                Right
              </button>
              <button
                style={{ zIndex: 20, pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => sendIntent({ type: 'rotate' })}
              >
                Rotate
              </button>
              <button
                style={{ zIndex: 20, pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => sendIntent({ type: 'soft' })}
              >
                Soft
              </button>
              <button
                style={{ zIndex: 20, pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => sendIntent({ type: 'hard' })}
              >
                Hard
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
              <div>
                <strong>Hold</strong>
                <div style={{ marginTop: 6 }}>{renderNextPreview(myView?.holdPiece ?? null, 14)}</div>
              </div>
              <div>
                <strong>Next</strong>
                <div style={{ marginTop: 6 }}>{renderNextPreview(myView?.nextPiece ?? null, 14)}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3>Opponents</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {opponents.map((op) => (
              <div
                key={op.id}
                style={{ width: 120 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12 }}>{op.name}</div>
                    <div style={{ fontSize: 11, color: '#333' }}>Score: {op.score}</div>
                  </div>
                  <div style={{ fontSize: 10, color: op.isAlive ? '#000' : '#777' }}>
                    {op.isAlive ? 'alive' : 'dead'}
                  </div>
                </div>
                <div style={{ marginTop: 6 }}>{renderOpponentBoard(op.board ?? null, op.isAlive, 3)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <details className='mt-4'>
        <summary>Raw state</summary>
        <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(state, null, 2)}</pre>
      </details>
    </main>
  );
}
