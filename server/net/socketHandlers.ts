import { Server, Socket } from 'socket.io';
import type { GameMode } from '../constants';
import { GAME_MODES, TICK_INTERVAL_MS } from '../constants';
import { GameManager } from '../core/GameManager';
import GameService from '../core/GameService';
import { Player } from '../core/Player';
import { Game } from '../game/Game';
import { GameEngine } from '../game/GameEngine';
import type { Intent, PlayerState } from '../game/types';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socketEvents';
import { logger } from '../utils/logger';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>;

export const MAX_PLAYERS_PER_ROOM = 8;
export const MAX_SOCKETS_PER_USER = 5;
// Holding two keys sends ~40 intents/s (50 ms auto-repeat), so 60/s never limits real play
export const MAX_EVENTS_PER_SECOND = 60;
// create + join per user, so room codes cannot be brute-forced and rooms cannot be mass-created
export const MAX_ROOM_ACTIONS_PER_MINUTE = 10;

const ROOM_ID_PATTERN = /^[0-9A-F]{6}$/;

// Payloads come straight from the network: anything not matching the expected shape is rejected
function parseRoomId(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { roomId } = payload as { roomId?: unknown };
  if (typeof roomId !== 'string') return null;
  const normalized = roomId.trim().toUpperCase();
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null;
}

function parseMode(payload: unknown): GameMode | null {
  if (payload === undefined) return 'classic';
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const { mode } = payload as { mode?: unknown };
  if (mode === undefined) return 'classic';
  return (GAME_MODES as readonly unknown[]).includes(mode) ? (mode as GameMode) : null;
}

function parseIntent(payload: unknown): Intent | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { intent } = payload as { intent?: unknown };
  if (typeof intent !== 'object' || intent === null) return null;
  const { type, dir } = intent as { type?: unknown; dir?: unknown };
  if (type === 'move') return dir === 'left' || dir === 'right' ? { type, dir } : null;
  if (type === 'rotate' || type === 'soft' || type === 'hard' || type === 'hold') return { type };
  return null;
}

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>,
  manager: GameManager
) {
  // Track running game loops so we can clear them when game ends/restarts/removed
  const gameIntervals = new Map<string, NodeJS.Timeout>();
  const socketsPerUser = new Map<number, number>();
  const roomActions = new Map<number, number[]>();

  function allowRoomAction(userId: number): boolean {
    const now = Date.now();
    const recent = (roomActions.get(userId) ?? []).filter((t) => now - t < 60_000);
    const allowed = recent.length < MAX_ROOM_ACTIONS_PER_MINUTE;
    if (allowed) recent.push(now);
    roomActions.set(userId, recent);
    return allowed;
  }

  io.on('connection', (socket: TypedSocket) => {
    logger.info('socket connected', socket.id);

    const connectedUserId = socket.data.user?.userId;
    if (connectedUserId !== undefined) {
      const count = (socketsPerUser.get(connectedUserId) ?? 0) + 1;
      socketsPerUser.set(connectedUserId, count);
      if (count > MAX_SOCKETS_PER_USER) {
        // Give the slot back right away: the disconnect listener below is never registered for this socket
        socketsPerUser.set(connectedUserId, count - 1);
        logger.warn(`user ${connectedUserId} exceeded ${MAX_SOCKETS_PER_USER} sockets, disconnecting ${socket.id}`);
        socket.disconnect(true);
        return;
      }
    }

    let windowStart = Date.now();
    let eventsInWindow = 0;
    function withinRateLimit(): boolean {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        eventsInWindow = 0;
      }
      eventsInWindow += 1;
      return eventsInWindow <= MAX_EVENTS_PER_SECOND;
    }

    // Every client event goes through here: excess events are dropped, and a handler that
    // throws or rejects is logged instead of taking the whole process down
    function handle(event: keyof ClientToServerEvents, handler: (payload: unknown) => unknown) {
      // Payloads are validated inside each handler, so the listener deliberately accepts `unknown`
      const untyped = socket as unknown as { on(ev: string, listener: (payload: unknown) => unknown): void };
      untyped.on(event, (payload: unknown) => {
        if (!withinRateLimit()) return;
        try {
          return Promise.resolve(handler(payload)).catch((err: unknown) =>
            logger.error(`socket ${event} handler failed`, err)
          );
        } catch (err) {
          logger.error(`socket ${event} handler failed`, err);
        }
      });
    }

    // Removes this socket's player from every room except `keepRoomId` (one room per socket)
    function leaveGames(keepRoomId?: string) {
      for (const [roomId, game] of manager.games.entries()) {
        if (roomId === keepRoomId) continue;
        const playerEntry = game.getPlayers().find((p) => p.socketId === socket.id);
        if (!playerEntry) continue;

        const leavingId = playerEntry.id;
        logger.info(`server: removing player ${leavingId} from game ${roomId}`);
        void socket.leave(roomId);

        // remove from players map and game state
        game.players.delete(leavingId);
        delete game.state.playerStates[leavingId];

        // if host left, pick a random new host among remaining players
        if (game.hostId === leavingId) {
          const remaining = game.getPlayers();
          if (remaining.length > 0) {
            const idx = Math.floor(Math.random() * remaining.length);
            const newHost = remaining[idx];
            game.hostId = newHost.id;
            logger.info(`server: new host for ${roomId} is ${newHost.id}`);
            io.to(roomId).emit('host_changed', { newHostId: newHost.id, message: `New host is ${newHost.name}` });
          } else {
            // no players left, remove game
            logger.info(`server: no players left in ${roomId}, removing game`);
            const iv = gameIntervals.get(roomId);
            if (iv) {
              clearInterval(iv);
              gameIntervals.delete(roomId);
            }
            manager.removeGame(roomId);
            continue;
          }
        }

        // broadcast updated sanitized state to remaining players
        emitSanitizedState(game);
      }
    }

    function emitSanitizedState(game: Game) {
      const state = game.getState();
      const alivePlayerIds = Object.entries(state.playerStates)
        .filter(([, ps]) => ps.isAlive)
        .map(([id]) => id);
      const winnerId = state.status === 'finished' && alivePlayerIds.length === 1 ? alivePlayerIds[0] : null;

      const playersObj: Record<string, PlayerState> = {};

      for (const [pid, playerState] of Object.entries(game.getState().playerStates)) {
        const playerMeta = game.getPlayer(pid);
        playersObj[pid] = {
          board: game.engine.renderBoardWithGhost(playerState.board, playerState.activePiece),
          activePiece: playerState.activePiece,
          nextPiece: playerState.nextPiece,
          speed: playerState.speed,
          holdPiece: playerState.holdPiece,
          holdLocked: playerState.holdLocked,
          piecesPlaced: playerState.piecesPlaced,
          score: playerState.score,
          isAlive: playerState.isAlive,
          diedAt: playerState.diedAt,
          name: playerMeta?.name ?? playerState.name,
        };
      }

      for (const player of game.getPlayers()) {
        io.to(player.socketId).emit('state', {
          status: state.status,
          tick: state.tick,
          speed: state.speed,
          players: playersObj,
          winnerId,
          hostId: game.hostId,
          mode: game.mode,
        });
      }
    }

    handle('create', async (payload) => {
      const user = socket.data.user;
      if (!user) {
        socket.emit('create_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        logger.error('Create failed: not authenticated');
        return;
      }

      const mode = parseMode(payload);
      if (!mode) {
        socket.emit('create_failed', { code: 'INVALID_MODE', message: 'Unknown game mode' });
        return;
      }

      if (!allowRoomAction(user.userId)) {
        socket.emit('create_failed', { code: 'RATE_LIMITED', message: 'Too many rooms created, try again shortly' });
        return;
      }

      leaveGames();

      const playerId = String(user.userId);
      const player = new Player(playerId, user.username, socket.id);
      const game = manager.createNewGame(player, mode);

      logger.info(`Game created: room=${game.id} host=${player.id}`);

      game.state.status = 'waiting';

      await socket.join(game.id);
      socket.emit('created', { roomId: game.id });
      emitSanitizedState(game);
    });

    handle('join', async (payload) => {
      const user = socket.data.user;
      if (!user) {
        socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        logger.error('Join failed: not authenticated');
        return;
      }

      if (!allowRoomAction(user.userId)) {
        socket.emit('join_failed', { code: 'RATE_LIMITED', message: 'Too many join attempts, try again shortly' });
        return;
      }

      // Only validated codes are looked up or logged (raw input could inject newlines or escape codes)
      const roomId = parseRoomId(payload);
      const game = roomId ? manager.getGame(roomId) : undefined;
      if (!roomId || !game) {
        socket.emit('join_failed', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        logger.error(`Room not found: ${roomId ?? '(invalid room id)'}`);
        return;
      }

      if (game.state.status !== 'waiting') {
        socket.emit('join_failed', { code: 'GAME_STARTED', message: 'Game already started' });
        logger.error('Game already started: ' + roomId);
        return;
      }

      const uid = user.userId;
      const playerId = String(uid);
      if (!game.getPlayer(playerId) && game.getPlayers().length >= MAX_PLAYERS_PER_ROOM) {
        socket.emit('join_failed', { code: 'ROOM_FULL', message: `Room is full (${MAX_PLAYERS_PER_ROOM} players)` });
        return;
      }

      leaveGames(roomId);

      const player = new Player(playerId, user.username, socket.id);
      game.addPlayer(player);
      await socket.join(roomId);
      emitSanitizedState(game);
      socket.emit('joined', { roomId });
    });

    handle('intent', (payload) => {
      const user = socket.data.user;
      if (!user) {
        socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      const roomId = parseRoomId(payload);
      const intent = parseIntent(payload);
      const game = roomId ? manager.getGame(roomId) : undefined;
      const playerId = String(user.userId);
      // Only players of the room may act in it (and trigger a broadcast to everyone there)
      if (!game || !intent || !game.getPlayer(playerId)) {
        return;
      }
      game.applyInput(playerId, intent);
      emitSanitizedState(game);
    });

    handle('start', (payload) => {
      logger.info('start the game');

      const user = socket.data.user;
      if (!user) {
        socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      const roomId = parseRoomId(payload);
      const playerId = String(user.userId);
      const game = roomId ? manager.getGame(roomId) : undefined;

      if (!roomId || !game) {
        socket.emit('start_failed', { code: 'INVALID_ROOM', message: 'Room not found' });
        return;
      }
      if (game.hostId !== playerId) {
        socket.emit('start_failed', { code: 'NOT_HOST', message: 'Only host may start the game' });
        return;
      }
      if (game.state.status !== 'waiting') {
        socket.emit('start_failed', { code: 'ALREADY_STARTED', message: 'Game already started' });
        return;
      }

      game.state.status = 'running';

      // track previous alive state to emit game over messages
      const prevAlive: Record<string, boolean> = {};
      for (const player of game.getPlayers()) {
        prevAlive[player.id] = Boolean(game.state.playerStates[player.id]?.isAlive);
      }

      // remember how many players were present when the game started
      const initialPlayerCount = game.getPlayers().length;
      game.state.initialPlayerCount = initialPlayerCount;

      const existing = gameIntervals.get(game.id);
      if (existing) {
        clearInterval(existing);
      }
      const interval = setInterval(() => {
        try {
          game.tick();

          const aliveIds = Object.keys(game.state.playerStates).filter((pid) => game.state.playerStates[pid].isAlive);
          const deadIds = Object.keys(game.state.playerStates).filter((pid) => !game.state.playerStates[pid].isAlive);

          for (const id of deadIds) {
            if (prevAlive[id]) {
              logger.info(`server: player ${id} dead`);
              const p = game.getPlayer(id);
              if (p?.socketId) {
                logger.info(`server: emitting game_over to ${p.socketId} for player ${id}`);
                io.to(p.socketId).emit('game_over', { message: 'game over' });
              }
              prevAlive[id] = false;
            }
          }

          emitSanitizedState(game);

          // decide end-of-game behavior:
          // - For multi-player games (initialPlayerCount > 1) we stop when 0 or 1 alive and declare a winner if 1 remains.
          // - For single-player games (initialPlayerCount === 1) we only stop when the player dies (aliveIds.length === 0).
          const shouldEnd =
            game.state.status === 'finished' ||
            (initialPlayerCount > 1 && aliveIds.length <= 1) ||
            (initialPlayerCount === 1 && aliveIds.length === 0);

          if (shouldEnd) {
            // ensure status is marked finished so clients see it
            game.state.status = 'finished';

            if (initialPlayerCount > 1 && aliveIds.length === 1) {
              const winnerId = aliveIds[0];
              logger.info(`server: winner detected: ${winnerId}`);
              const winnerPlayer = game.getPlayer(winnerId);
              if (winnerPlayer?.socketId) {
                logger.info(`server: emitting winner to ${winnerPlayer.socketId} for player ${winnerId}`);
                io.to(winnerPlayer.socketId).emit('winner', { message: 'winner winner chicken dinner' });
              }

              // notify losers as well
              for (const id of Object.keys(game.state.playerStates)) {
                if (id === winnerId) continue;
                const p = game.getPlayer(id);
                if (p?.socketId) {
                  logger.info(`server: emitting game_over to ${p.socketId} for player ${id}`);
                  io.to(p.socketId).emit('game_over', { message: 'game over' });
                }
              }
            } else if (aliveIds.length === 0) {
              logger.info('server: no alive players at end of game');
              // notify all of game over
              for (const id of Object.keys(game.state.playerStates)) {
                const p = game.getPlayer(id);
                if (p?.socketId) {
                  logger.info(`server: emitting game_over to ${p.socketId} for player ${id}`);
                  io.to(p.socketId).emit('game_over', { message: 'game over' });
                }
              }
            }

            // stop and remove stored interval for this game
            const iv = gameIntervals.get(game.id);
            if (iv) {
              clearInterval(iv);
              gameIntervals.delete(game.id);
            }
            emitSanitizedState(game);

            // persist finished game and records (fire-and-forget with logging)
            GameService.saveFinishedGame(game)
              .then((gid) => logger.info(`Persisted finished game id=${gid} for room ${game.id}`))
              .catch((err) => logger.error('Failed to persist finished game', err));
          }
        } catch (err) {
          logger.error('game tick error', err);
        }
      }, TICK_INTERVAL_MS);
      // store the interval so we can clear it later (restart/disconnect/remove)
      gameIntervals.set(game.id, interval);
      // initial broadcast
      emitSanitizedState(game);
    });

    handle('restart', (payload) => {
      logger.info('restart the game');

      const user = socket.data.user;
      if (!user) {
        socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
        return;
      }

      const roomId = parseRoomId(payload);
      const playerId = String(user.userId);
      const game = roomId ? manager.getGame(roomId) : undefined;

      if (!roomId || !game) {
        socket.emit('restart_failed', { code: 'INVALID_ROOM', message: 'Room not found' });
        return;
      }

      if (game.hostId !== playerId) {
        socket.emit('restart_failed', { code: 'NOT_HOST', message: 'Only host may restart the game' });
        return;
      }

      // clear any existing loop for this room before resetting
      const iv = gameIntervals.get(roomId);
      if (iv) {
        clearInterval(iv);
        gameIntervals.delete(roomId);
      }
      // reset engine and state while preserving players and host
      logger.info(`server: restarting game ${roomId} by host ${playerId}`);
      game.engine = new GameEngine(game.id, game.mode);
      const playerIds = game.getPlayers().map((p) => p.id);
      game.state = game.engine.createInitialState(playerIds);
      game.state.status = 'waiting';

      io.to(roomId).emit('restarted', { message: 'Game restarted by host' });
      emitSanitizedState(game);
    });

    socket.on('disconnect', () => {
      logger.info('socket disconnected', socket.id);

      if (connectedUserId !== undefined) {
        const remaining = (socketsPerUser.get(connectedUserId) ?? 1) - 1;
        if (remaining > 0) socketsPerUser.set(connectedUserId, remaining);
        else socketsPerUser.delete(connectedUserId);
      }

      // Find any games that contain this socket and remove the player
      leaveGames();
    });
  });
}
