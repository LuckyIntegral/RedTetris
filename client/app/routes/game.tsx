import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

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
  const [state, setState] = useState<any>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (socketRef.current) return; // avoid duplicate sockets in StrictMode / HMR
    const url = (import.meta.env.VITE_SERVER_URL as string) ?? 'http://localhost:3001';
    const s = io(url, { autoConnect: false });
    socketRef.current = s;

    s.on('connect', () => console.log('connected to server'));
    s.on('state', (payload: any) => {
      console.log(
        'client: state',
        payload?.state?.status,
        payload?.state?.players && Object.keys(payload.state.players).length
      );
      // server sends { state, hostId }
      if (payload && typeof payload === 'object' && 'state' in payload) {
        setState(payload.state);
        setHostId(payload.hostId ?? null);
      } else {
        setState(payload);
      }
    });
    s.on('joined', (info: any) => {
      setPlayerId(info.playerId);
      setRoom(info.room ?? room);
      setError(null);
    });
    s.on('created', (info: any) => {
      setPlayerId(info.playerId);
      setRoom(info.room ?? room);
      setError(null);
    });
    s.on('game_over', (info: any) => {
      console.log('client: received game_over', info);
      setMessage(info?.message ?? 'game over');
    });
    s.on('winner', (info: any) => {
      console.log('client: received winner', info);
      setMessage(info?.message ?? 'YOU WIN');
    });
    s.on('create_failed', (info: any) => {
      setError(info?.reason ?? 'CREATE_FAILED');
    });
    s.on('join_failed', (info: any) => {
      setError(info?.reason ?? 'JOIN_FAILED');
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
      if (e.key === 'ArrowLeft')
        socketRef.current.emit('intent', { room, playerId, intent: { type: 'move', dir: 'left' } });
      if (e.key === 'ArrowRight')
        socketRef.current.emit('intent', { room, playerId, intent: { type: 'move', dir: 'right' } });
      if (e.key === 'ArrowUp') socketRef.current.emit('intent', { room, playerId, intent: { type: 'rotate' } });
      if (e.key === 'ArrowDown') socketRef.current.emit('intent', { room, playerId, intent: { type: 'soft' } });
      if (e.code === 'Space') {
        e.preventDefault();
        socketRef.current.emit('intent', { room, playerId, intent: { type: 'hard' } });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playerId, room]);

  const join = () => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) s.connect();
    s.emit('join', { room, name });
  };

  const create = () => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) s.connect();
    s.emit('create', { room: room || undefined, name });
    // optimistically show passcode while server confirms
    setError(null);
  };

  const start = () => {
    const s = socketRef.current;
    if (!s || !playerId) return;
    // only host can start
    if (hostId && playerId !== hostId) {
      setError('ONLY_HOST_CAN_START');
      return;
    }
    s.emit('start', { room, playerId });
  };

  const sendIntent = (intent: any) => {
    const s = socketRef.current;
    if (!s || !playerId) return;
    // don't send intents after game end
    if (state?.status === 'finished' || message) return;
    s.emit('intent', { room, playerId, intent });
  };

  const myView = useMemo(() => {
    if (!state || !playerId) return null;
    return state.players?.[playerId] ?? null;
  }, [state, playerId]);

  // show win/lose messages based on state transitions in case socket events
  // are missed or as additional UX feedback
  const prevAliveRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!state || !playerId) return;
    const alive = Boolean(state.players?.[playerId]?.isAlive);
    const prev = prevAliveRef.current;
    // on transition alive -> dead
    if (prev === true && alive === false) {
      setMessage('You lost');
    }
    // when game finished and player still alive -> winner
    if ((state.status === 'finished' || state.winnerId) && state.winnerId === playerId) {
      setMessage('You win');
    }
    prevAliveRef.current = alive;
  }, [state, playerId]);

  const renderCell = (x: number, y: number) => {
    // player board rows are indexed 0..HEIGHT-1
    // server provides numeric board values 0..N (0 = empty)
    const val = myView?.board?.[y]?.[x] ?? 0;
    return (
      <div
        key={`${x}-${y}`}
        style={{ width: CELL, height: CELL, boxSizing: 'border-box', border: '1px solid #222' }}
        className={
          val == 0
            ? 'bg-transparent'
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
              ][val - 1]
        }
      />
    );
  };

  const opponents = useMemo(() => {
    if (!state || !playerId) return [];
    return Object.entries(state.players)
      .filter(([id]) => id !== playerId)
      .map(([id, p]: any) => ({
        id,
        name: p.name ?? id,
        spectrum: p.spectrum ?? Array.from({ length: WIDTH }, () => 0),
      }));
  }, [state, playerId]);

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
        </div>
        {hostId && playerId === hostId && (
          <div className='mt-2'>
            <strong>Passcode:</strong> {room}
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
                const cells = [] as any[];
                for (let y = 0; y < HEIGHT; y++) {
                  for (let x = 0; x < WIDTH; x++) cells.push(renderCell(x, y));
                }
                return cells;
              })()}
            </div>
          </div>
          <div className='mt-2'>
            <div className='space-x-2'>
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
                <div style={{ fontSize: 12 }}>{op.name}</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'end', height: 120 }}>
                  {op.spectrum.map((h: number, i: number) => (
                    <div
                      key={i}
                      style={{ width: 8, height: Math.min(120, (h / HEIGHT) * 120) || 4, background: '#333' }}
                    />
                  ))}
                </div>
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
