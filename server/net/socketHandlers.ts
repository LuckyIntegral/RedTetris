import { Server, Socket } from 'socket.io';
import { GameManager } from '../core/GameManager';
import { Player } from '../core/Player';
import { Game } from '../game/Game';
import { GameEngine } from '../game/GameEngine';
import type { Intent, PlayerState } from '../game/types';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socketEvents';
import { logger } from '../utils/logger';
import { TICK_RATE } from '../game/contstants';

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>,
  manager: GameManager
) {
  io.on(
    'connection',
    (socket: Socket<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>) => {
      logger.info('socket connected', socket.id);

      function emitSanitizedState(game: Game) {
        const state = game.getState();
        const alivePlayers = game.getPlayers().filter((p) => p.isAlive);
        const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;

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
          });
        }
      }

      socket.on('create', async () => {
        const user = socket.data.user;
        if (!user) {
          socket.emit('create_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
          logger.error('Create failed: not authenticated');
          return;
        }

        const playerId = String(user.userId);
        const player = new Player(playerId, user.username, socket.id);
        const game = manager.createNewGame(player);

        logger.info(`Game created: room=${game.id} host=${player.id}`);

        game.state.status = 'waiting';

        await socket.join(game.id);
        socket.emit('created', { roomId: game.id });
        emitSanitizedState(game);
      });

      socket.on('join', async (payload: { roomId: string }) => {
        const user = socket.data.user;
        if (!user) {
          socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
          logger.error('Join failed: not authenticated');
          return;
        }

        const game = manager.getGame(payload.roomId);
        if (!game) {
          socket.emit('join_failed', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          logger.error('Room not found: ' + payload.roomId);
          return;
        }

        if (game.state.status !== 'waiting') {
          socket.emit('join_failed', { code: 'GAME_STARTED', message: 'Game already started' });
          logger.error('Game already started: ' + payload.roomId);
          return;
        }

        const uid = 'id' in user ? user.id : user.userId;
        const playerId = String(uid);
        const player = new Player(playerId, user.username, socket.id);
        game.addPlayer(player);
        await socket.join(payload.roomId);
        emitSanitizedState(game);
        socket.emit('joined', { roomId: payload.roomId });
      });

      socket.on('intent', (payload: { roomId: string; intent: Intent }) => {
        const user = socket.data.user;
        if (!user) {
          socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
          return;
        }

        const game = manager.getGame(payload.roomId);
        if (!game) {
          return;
        }
        game.applyInput(String(user.userId), payload.intent);
        emitSanitizedState(game);
      });

      socket.on('start', (payload: { roomId: string }) => {
        logger.info('start the game');

        const user = socket.data.user;
        if (!user) {
          socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
          return;
        }

        const roomId = payload.roomId;
        const playerId = String(user.userId);
        const game = manager.getGame(roomId);

        if (!game) {
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

              clearInterval(interval);
              emitSanitizedState(game);
            }
          } catch (err) {
            logger.error('game tick error', err);
          }
        }, 1000 / TICK_RATE);
        // initial broadcast
        emitSanitizedState(game);
      });

      socket.on('restart', (payload: { roomId: string }) => {
        logger.info('restart the game', payload);

        const user = socket.data.user;
        if (!user) {
          socket.emit('join_failed', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
          return;
        }

        const roomId = payload.roomId;
        const playerId = String(user.userId);
        const game = manager.getGame(roomId);

        if (!game) {
          socket.emit('restart_failed', { code: 'INVALID_ROOM', message: 'Room not found' });
          return;
        }

        if (game.hostId !== playerId) {
          socket.emit('restart_failed', { code: 'NOT_HOST', message: 'Only host may restart the game' });
          return;
        }

        // reset engine and state while preserving players and host
        logger.info(`server: restarting game ${roomId} by host ${playerId}`);
        game.engine = new GameEngine(game.id);
        const playerIds = game.getPlayers().map((p) => p.id);
        game.state = game.engine.createInitialState(playerIds);
        game.state.status = 'waiting';

        io.to(roomId).emit('restarted', { message: 'Game restarted by host' });
        emitSanitizedState(game);
      });

      socket.on('disconnect', () => {
        logger.info('socket disconnected', socket.id);

        // Find any games that contain this socket and remove the player
        for (const [roomId, game] of manager.games.entries()) {
          const playerEntry = game.getPlayers().find((p) => p.socketId === socket.id);
          if (!playerEntry) continue;

          const leavingId = playerEntry.id;
          logger.info(`server: removing player ${leavingId} from game ${roomId}`);

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
              manager.removeGame(roomId);
              continue;
            }
          }

          // broadcast updated sanitized state to remaining players
          emitSanitizedState(game);
        }
      });
    }
  );
}
