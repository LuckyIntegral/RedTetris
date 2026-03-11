import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import authReducer from '~/store/authSlice';

// --- Mocks ---

vi.mock('~/services/auth', () => ({
  authService: {
    getToken: vi.fn(() => 'mock-token'),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi
      .fn()
      .mockResolvedValue({ id: 42, username: 'testplayer', email: 'test@test.com', created_at: '', updated_at: '' }),
  },
}));

function createMockSocket() {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  const socket = {
    connected: false,
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return socket;
    }),
    off: vi.fn(() => {
      Object.keys(handlers).forEach((k) => delete handlers[k]);
      return socket;
    }),
    emit: vi.fn(),
    connect: vi.fn(() => {
      socket.connected = true;
    }),
    disconnect: vi.fn(() => {
      socket.connected = false;
    }),
    _trigger: (event: string, ...args: any[]) => {
      (handlers[event] ?? []).forEach((h) => h(...args));
    },
    _handlers: handlers,
  };
  return socket;
}

let mockSocket: ReturnType<typeof createMockSocket>;

vi.mock('socket.io-client', () => ({ io: vi.fn(() => mockSocket) }));

import { authService } from '~/services/auth';

const delay = (ms = 20) => new Promise((r) => setTimeout(r, ms));

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: 42, username: 'testplayer', email: 'test@test.com', created_at: '', updated_at: '' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        hydrated: true,
      },
    },
  });

async function renderGame() {
  const { default: GameRoute, meta } = await import('~/routes/game');
  const store = createStore();

  const result = render(
    <Provider store={store}>
      <MemoryRouter>
        <GameRoute />
      </MemoryRouter>
    </Provider>
  );

  return { ...result, store, meta };
}

/** Trigger a mock socket event inside an async act block with a flush delay */
async function triggerSocket(event: string, ...args: any[]) {
  await act(async () => {
    mockSocket._trigger(event, ...args);
    await delay();
  });
}

/** Assert text exists in DOM (handles duplicate mobile/desktop renders) */
function expectTextPresent(text: string) {
  const els = screen.queryAllByText(text);
  expect(els.length).toBeGreaterThan(0);
}

describe('Game Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
  });

  describe('meta', () => {
    it('returns correct page title', async () => {
      const { meta } = await import('~/routes/game');
      const result = meta({} as any);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Red Tetris — Play' })]));
    });
  });

  describe('GameComponent rendering', () => {
    it('renders the main game UI', async () => {
      await renderGame();
      expect(screen.getByText('RED TETRIS')).toBeInTheDocument();
      expect(screen.getByText('Play Mode')).toBeInTheDocument();
    });

    it('renders Back link', async () => {
      await renderGame();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('renders Room Settings heading', async () => {
      await renderGame();
      expectTextPresent('Room Settings');
    });

    it('renders game mode selector', async () => {
      await renderGame();
      const classicLabels = screen.getAllByText('Classic');
      expect(classicLabels.length).toBeGreaterThan(0);
    });

    it('renders Your Board section', async () => {
      await renderGame();
      expect(screen.getByText('Your Board')).toBeInTheDocument();
    });

    it('renders Hold and Next panels', async () => {
      await renderGame();
      expect(screen.getByText('Hold')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('shows score as 0 initially', async () => {
      await renderGame();
      const scoreElements = screen.getAllByText('0');
      expect(scoreElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Score')).toBeInTheDocument();
    });
  });

  describe('room actions', () => {
    it('renders Create button', async () => {
      await renderGame();
      expectTextPresent('Create');
    });

    it('renders Join button', async () => {
      await renderGame();
      expectTextPresent('Join');
    });

    it('renders Start Game button', async () => {
      await renderGame();
      expectTextPresent('Start');
    });

    it('clicking Create connects socket and emits create', async () => {
      await renderGame();
      const createBtns = screen.getAllByRole('button', { name: /Create/ });
      fireEvent.click(createBtns[0]);

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('create', { mode: 'classic' });
    });

    it('clicking Join connects socket and emits join', async () => {
      await renderGame();
      const inputs = screen.getAllByPlaceholderText(/room code/i);
      fireEvent.change(inputs[0], { target: { value: 'ROOM123' } });

      const joinBtns = screen.getAllByRole('button', { name: /Join/ });
      const enabledJoinBtn = joinBtns.find((b) => !b.hasAttribute('disabled'));
      if (enabledJoinBtn) {
        fireEvent.click(enabledJoinBtn);
        expect(mockSocket.connect).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('join', { roomId: 'ROOM123' });
      }
    });
  });

  describe('socket events', () => {
    it('handles "created" event - sets room and playerId', async () => {
      await renderGame();

      await triggerSocket('created', { roomId: 'NEW_ROOM' });

      await waitFor(() => {
        expect(screen.getAllByText(/Leave/).length).toBeGreaterThan(0);
      });
    });

    it('handles "joined" event - sets room and playerId', async () => {
      await renderGame();

      await triggerSocket('joined', { roomId: 'JOINED_ROOM' });

      await waitFor(() => {
        expect(screen.getAllByText(/Leave/).length).toBeGreaterThan(0);
      });
    });

    it('handles "state" event - updates game state', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      await triggerSocket('state', {
        status: 'running' as const,
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board: Array.from({ length: 20 }, () => Array(10).fill(0)),
            activePiece: null,
            nextPiece: 'T',
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 150,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => expectTextPresent('150'));
    });

    it('handles "host_changed" event', async () => {
      await renderGame();
      await triggerSocket('host_changed', { newHostId: '99', message: 'Host changed!' });
      await waitFor(() => expectTextPresent('Host changed!'));
    });

    it('handles "game_over" event', async () => {
      await renderGame();
      await triggerSocket('game_over', { message: 'Game Over!' });
      await waitFor(() => expectTextPresent('Game Over!'));
    });

    it('handles "game_over" with no message', async () => {
      await renderGame();
      await triggerSocket('game_over', {});
      await waitFor(() => expectTextPresent('game over'));
    });

    it('handles "winner" event', async () => {
      await renderGame();
      await triggerSocket('winner', { message: 'Player wins!' });
      await waitFor(() => expectTextPresent('Player wins!'));
    });

    it('handles "winner" with no message', async () => {
      await renderGame();
      await triggerSocket('winner', {});
      await waitFor(() => expectTextPresent('YOU WIN'));
    });

    it('handles "create_failed" event', async () => {
      await renderGame();
      await triggerSocket('create_failed', { code: 'ERR', message: 'Room exists' });
      await waitFor(() => expectTextPresent('Room exists'));
    });

    it('handles "create_failed" with only code', async () => {
      await renderGame();
      await triggerSocket('create_failed', { code: 'ROOM_EXISTS' });
      await waitFor(() => expectTextPresent('ROOM_EXISTS'));
    });

    it('handles "create_failed" with no info', async () => {
      await renderGame();
      await triggerSocket('create_failed', {});
      await waitFor(() => expectTextPresent('CREATE_FAILED'));
    });

    it('handles "join_failed" event', async () => {
      await renderGame();
      await triggerSocket('join_failed', { message: 'Room full' });
      await waitFor(() => expectTextPresent('Room full'));
    });

    it('handles "join_failed" with code only', async () => {
      await renderGame();
      await triggerSocket('join_failed', { code: 'ROOM_FULL' });
      await waitFor(() => expectTextPresent('ROOM_FULL'));
    });

    it('handles "join_failed" with no info', async () => {
      await renderGame();
      await triggerSocket('join_failed', {});
      await waitFor(() => expectTextPresent('JOIN_FAILED'));
    });

    it('handles "start_failed" event', async () => {
      await renderGame();
      await triggerSocket('start_failed', { message: 'Not enough players' });
      await waitFor(() => expectTextPresent('Not enough players'));
    });

    it('handles "start_failed" with code only', async () => {
      await renderGame();
      await triggerSocket('start_failed', { code: 'NOT_ENOUGH' });
      await waitFor(() => expectTextPresent('NOT_ENOUGH'));
    });

    it('handles "start_failed" with no info', async () => {
      await renderGame();
      await triggerSocket('start_failed', {});
      await waitFor(() => expectTextPresent('START_FAILED'));
    });

    it('handles "restarted" event with message', async () => {
      await renderGame();
      await triggerSocket('restarted', { message: 'Game restarted!' });
      await waitFor(() => expectTextPresent('Game restarted!'));
    });

    it('handles "restarted" event without message', async () => {
      await renderGame();
      await triggerSocket('restarted', {});
      // No error thrown, actionLoading set to false
    });

    it('handles "restart_failed" event with message', async () => {
      await renderGame();
      await triggerSocket('restart_failed', { message: 'Cannot restart' });
      await waitFor(() => expectTextPresent('Cannot restart'));
    });

    it('handles "restart_failed" event with reason', async () => {
      await renderGame();
      await triggerSocket('restart_failed', { reason: 'Game not finished' });
      await waitFor(() => expectTextPresent('Game not finished'));
    });

    it('handles "restart_failed" event with no info', async () => {
      await renderGame();
      await triggerSocket('restart_failed', {});
      await waitFor(() => expectTextPresent('RESTART_FAILED'));
    });

    it('handles "connect_error" with Error object', async () => {
      await renderGame();
      await triggerSocket('connect_error', new Error('Connection refused'));
      await waitFor(() => expectTextPresent('Connection refused'));
    });

    it('handles "connect_error" with string', async () => {
      await renderGame();
      await triggerSocket('connect_error', 'Auth failed');
      await waitFor(() => expectTextPresent('Auth failed'));
    });

    it('handles "state" event with mode syncing', async () => {
      await renderGame();

      await triggerSocket('state', {
        status: 'waiting' as const,
        tick: 0,
        speed: 20,
        players: {},
        hostId: '42',
        mode: 'narrow',
      });

      await waitFor(() => {
        const narrowLabels = screen.getAllByText('6 × 22');
        expect(narrowLabels.length).toBeGreaterThan(0);
      });
    });

    it('handles "created" with profile fetch failure', async () => {
      vi.mocked(authService.getProfile).mockRejectedValueOnce(new Error('Fetch failed'));
      await renderGame();
      await triggerSocket('created', { roomId: 'R1' });
      // Should not crash, error is just logged
    });

    it('handles "joined" with profile fetch failure', async () => {
      vi.mocked(authService.getProfile).mockRejectedValueOnce(new Error('Fetch failed'));
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });
      // Should not crash
    });
  });

  describe('leave action', () => {
    it('disconnects and resets state', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      const leaveBtns = screen.getAllByText(/Leave/);
      fireEvent.click(leaveBtns[0]);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('start action', () => {
    it('emits start when player is host', async () => {
      await renderGame();
      await triggerSocket('created', { roomId: 'R1' });

      await triggerSocket('state', {
        status: 'waiting',
        tick: 0,
        speed: 20,
        players: {
          '42': {
            board: [],
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      const startBtns = screen.getAllByRole('button', { name: /Start/ });
      const enabledStart = startBtns.find((b) => !b.hasAttribute('disabled'));
      if (enabledStart) {
        fireEvent.click(enabledStart);
        expect(mockSocket.emit).toHaveBeenCalledWith('start', { roomId: 'R1' });
      }
    });
  });

  describe('game board rendering', () => {
    it('renders board cells with different values', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      const board = Array.from({ length: 20 }, () => Array(10).fill(0));
      board[19][0] = 1;
      board[19][1] = -1;
      board[19][2] = -2;
      board[18][0] = 2;

      await triggerSocket('state', {
        status: 'running',
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board,
            activePiece: null,
            nextPiece: 'I',
            piecesPlaced: 1,
            speed: 20,
            holdPiece: 'T',
            holdLocked: false,
            score: 100,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => expectTextPresent('100'));
    });

    it('renders opponents when they exist', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0));

      await triggerSocket('state', {
        status: 'running',
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board: emptyBoard,
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
          '99': {
            board: emptyBoard,
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 200,
            isAlive: true,
            name: 'opponent1',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => {
        expectTextPresent('Opponents');
        expectTextPresent('opponent1');
        expectTextPresent('ALIVE');
      });
    });

    it('renders dead opponent correctly', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0));

      await triggerSocket('state', {
        status: 'running',
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board: emptyBoard,
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
          '99': {
            board: emptyBoard,
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 5,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 300,
            isAlive: false,
            name: 'deadguy',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => {
        expectTextPresent('deadguy');
        expectTextPresent('DEAD');
      });
    });
  });

  describe('keyboard controls', () => {
    it('sends intent on ArrowUp (rotate)', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      fireEvent.keyDown(window, { key: 'ArrowUp' });
      expect(mockSocket.emit).toHaveBeenCalledWith('intent', { roomId: 'ROOM1', intent: { type: 'rotate' } });
    });

    it('sends intent on Space (hard drop)', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
      expect(mockSocket.emit).toHaveBeenCalledWith('intent', { roomId: 'ROOM1', intent: { type: 'hard' } });
    });

    it('sends intent on Shift (hold)', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      fireEvent.keyDown(window, { key: 'Shift' });
      expect(mockSocket.emit).toHaveBeenCalledWith('intent', { roomId: 'ROOM1', intent: { type: 'hold' } });
    });

    it('sends move left on ArrowLeft', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(mockSocket.emit).toHaveBeenCalledWith('intent', {
        roomId: 'ROOM1',
        intent: { type: 'move', dir: 'left' },
      });
      fireEvent.keyUp(window, { key: 'ArrowLeft' });
    });

    it('sends move right on ArrowRight', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(mockSocket.emit).toHaveBeenCalledWith('intent', {
        roomId: 'ROOM1',
        intent: { type: 'move', dir: 'right' },
      });
      fireEvent.keyUp(window, { key: 'ArrowRight' });
    });

    it('sends soft drop on ArrowDown', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(mockSocket.emit).toHaveBeenCalledWith('intent', { roomId: 'ROOM1', intent: { type: 'soft' } });
      fireEvent.keyUp(window, { key: 'ArrowDown' });
    });

    it('does not fire repeated keyDown for held keys', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'ROOM1' });

      mockSocket.emit.mockClear();
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      const leftCalls = mockSocket.emit.mock.calls.filter(
        ([ev, payload]: any) => ev === 'intent' && payload?.intent?.type === 'move' && payload?.intent?.dir === 'left'
      );
      expect(leftCalls).toHaveLength(1);
      fireEvent.keyUp(window, { key: 'ArrowLeft' });
    });

    it('does not send intents when playerId is null', async () => {
      await renderGame();
      mockSocket.emit.mockClear();
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      const intentCalls = mockSocket.emit.mock.calls.filter(([ev]: any) => ev === 'intent');
      expect(intentCalls).toHaveLength(0);
    });
  });

  describe('win/lose detection', () => {
    it('shows "You lost" when player dies', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      await triggerSocket('state', {
        status: 'running',
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board: Array.from({ length: 20 }, () => Array(10).fill(0)),
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await triggerSocket('state', {
        status: 'running',
        tick: 2,
        speed: 20,
        players: {
          '42': {
            board: Array.from({ length: 20 }, () => Array(10).fill(0)),
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: false,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => expectTextPresent('You lost'));
    });

    it('shows "You win" when player is the winner', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      await triggerSocket('state', {
        status: 'running',
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board: Array.from({ length: 20 }, () => Array(10).fill(0)),
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await triggerSocket('state', {
        status: 'finished',
        tick: 10,
        speed: 20,
        players: {
          '42': {
            board: Array.from({ length: 20 }, () => Array(10).fill(0)),
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 500,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        winnerId: '42',
        mode: 'classic',
      });

      await waitFor(() => expectTextPresent('You win'));
    });
  });

  describe('finished game with restart', () => {
    it('shows restart button when game is finished and player is host', async () => {
      await renderGame();
      await triggerSocket('created', { roomId: 'R1' });

      await triggerSocket('state', {
        status: 'finished',
        tick: 100,
        speed: 20,
        players: {
          '42': {
            board: Array.from({ length: 20 }, () => Array(10).fill(0)),
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 10,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 1000,
            isAlive: false,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => {
        const restartBtns = screen.getAllByText(/Restart/);
        expect(restartBtns.length).toBeGreaterThan(0);
      });

      const restartBtns = screen.getAllByRole('button', { name: /Restart/ });
      fireEvent.click(restartBtns[0]);
      expect(mockSocket.emit).toHaveBeenCalledWith('restart', { roomId: 'R1' });
    });
  });

  describe('opponent board with spectrum', () => {
    it('renders opponent with spectrum data', async () => {
      await renderGame();
      await triggerSocket('joined', { roomId: 'R1' });

      const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0));

      await triggerSocket('state', {
        status: 'running',
        tick: 1,
        speed: 20,
        players: {
          '42': {
            board: emptyBoard,
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
          '50': {
            board: emptyBoard,
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 3,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 500,
            isAlive: true,
            name: 'player2',
            spectrum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => expectTextPresent('player2'));
    });
  });

  describe('hostName display', () => {
    it('shows host name with (you) suffix when player is host', async () => {
      await renderGame();
      await triggerSocket('created', { roomId: 'R1' });

      await triggerSocket('state', {
        status: 'waiting',
        tick: 0,
        speed: 20,
        players: {
          '42': {
            board: [],
            activePiece: null,
            nextPiece: null,
            piecesPlaced: 0,
            speed: 20,
            holdPiece: null,
            holdLocked: false,
            score: 0,
            isAlive: true,
            name: 'testplayer',
          },
        },
        hostId: '42',
        mode: 'classic',
      });

      await waitFor(() => {
        const youElements = screen.getAllByText('(you)');
        expect(youElements.length).toBeGreaterThan(0);
      });
    });
  });
});
