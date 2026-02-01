import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { GameManager } from '../core/GameManager';
import { Player } from '../core/Player';
import { Game } from '../game/Game';
import type { Intent, PlayerState } from '../game/types';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socketEvents';
import { logger } from '../utils/logger';

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, SocketData>,
  manager: GameManager
) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, SocketData>) => {
    logger.info('socket connected', socket.id);

    function emitSanitizedState(game: Game) {
      const state = game.getState();
      const alivePlayers = game.getPlayers().filter((p) => p.isAlive);
      const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;

      const playersObj: Record<string, PlayerState> = {};

      for (const [pid, playerState] of Object.entries(game.getState().playerStates)) {
        playersObj[pid] = {
          board: game.engine.renderBoardWithPiece(playerState.board, playerState.activePiece),
          activePiece: playerState.activePiece,
          nextPiece: playerState.nextPiece,
          piecesPlaced: playerState.piecesPlaced,
          isAlive: playerState.isAlive,
          name: playerState.name,
        };
      }

      for (const player of game.getPlayers()) {
        io.to(player.socketId).emit('state', {
          status: state.status,
          tick: state.tick,
          players: playersObj,
          winnerId,
          hostId: game.hostId,
        });
      }
    }

    socket.on('create', async (payload: { username: string }) => {
      // TODO: extend later with game modes/settings, payload should take it and connect with authenticated user
      logger.info('create a game for username ', payload.username);
      const player = new Player(randomUUID(), payload.username, socket.id);
      const game = manager.createNewGame(player);

      logger.info(`Game created: room=${game.id} host=${player.id}`);

      game.state.status = 'waiting';

      await socket.join(game.id); // TODO: check if await is needed here
      socket.emit('created', { playerId: player.id, roomId: game.id });
      emitSanitizedState(game);
    });

    socket.on('join', async (payload: { roomId: string; username: string }) => {
      // TODO: extend later with authenticated user
      const name = payload.username;

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

      const playerId: string = randomUUID(); // TODO: use players authenticated ID later
      const player = new Player(playerId, name, socket.id);
      game.addPlayer(player);
      await socket.join(payload.roomId);
      emitSanitizedState(game);
      // TODO: it is probably useless, make one response on success only
      socket.emit('joined', { playerId, roomId: payload.roomId });
    });

    socket.on('intent', (payload: { roomId: string; playerId: string; intent: Intent }) => {
      const game = manager.getGame(payload.roomId);
      if (!game) {
        return;
      }
      game.applyInput(payload.playerId, payload.intent);
      emitSanitizedState(game);
    });

    socket.on('start', (payload: { roomId: string; playerId: string }) => {
      logger.info('start the game');
      const roomId = payload.roomId;
      const playerId = payload.playerId;
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

      // start game loop for this room (slower)
      // TODO: extract to game manager later?
      const TICK_RATE = 1; // ticks per second

      // track previous alive state to emit game over messages
      const prevAlive: Record<string, boolean> = {};
      for (const player of game.getPlayers()) {
        prevAlive[player.id] = Boolean(game.state.playerStates[player.id]?.isAlive);
      }

      const interval = setInterval(() => {
        try {
          // tick game
          game.tick();

          // compute alive and dead players
          const aliveIds = Object.keys(game.state.playerStates).filter((pid) => game.state.playerStates[pid].isAlive);
          const deadIds = Object.keys(game.state.playerStates).filter((pid) => !game.state.playerStates[pid].isAlive);
          // logger.debug(`server: aliveIds=${aliveIds.length}`, aliveIds);
          // logger.debug(`server: deadIds=${deadIds.length}`, deadIds);

          // notify newly-dead players (compare with prevAlive)
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

          // broadcast sanitized per-player state
          emitSanitizedState(game);

          // if finished (0 or 1 alive), notify winner or broadcast game over, stop and cleanup
          if (game.state.status === 'finished' || aliveIds.length <= 1) {
            if (aliveIds.length === 1) {
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
              // no winners, notify all of game over
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
            manager.removeGame(roomId);
          }
        } catch (err) {
          logger.error('game tick error', err);
        }
      }, 1000 / TICK_RATE);
      // initial broadcast
      emitSanitizedState(game);
    });

    socket.on('disconnect', () => {
      logger.info('socket disconnected', socket.id);
      // Note: for brevity we don't reassign host or remove players here
      // add broadcast message 'New host is XXX' if host left, etc.
    });
  });
}
