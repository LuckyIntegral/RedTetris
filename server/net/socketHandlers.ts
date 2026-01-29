import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { GameManager } from '../core/GameManager';
import { Player } from '../core/Player';
import type { Intent } from '../game/types';
import { logger } from '../utils/logger';

export function registerSocketHandlers(io: Server, manager: GameManager) {
  io.on('connection', (socket: Socket) => {
    logger.info('socket connected', socket.id);

    function generateRoomCode() {
      const gen = () => Math.random().toString(36).slice(2, 8).toUpperCase();
      let code = gen();
      while (manager.getGame(code)) code = gen();
      return code;
    }

    // Create a new game (host)
    socket.on('create', (payload: { room?: string; name: string }) => {
      logger.info('create a game, ', payload);
      const room = payload.room?.trim() ? payload.room.trim() : generateRoomCode();
      const name = payload.name || 'host';
      const playerId = randomUUID();
      const sid = String(socket.id);
      const player = new Player(playerId, name, sid);

      // ensure room does not already exist
      const existing = manager.getGame(room);
      if (existing) {
        socket.emit('create_failed', { reason: 'ROOM_ALREADY_EXISTS', room });
        return;
      }

      const game = manager.createGame(room, player);

      logger.info(`Game created: room=${room} host=${playerId}`);

      // keep lobby in waiting state until host clicks start
      game.state.status = 'waiting';

      void socket.join(room);
      socket.emit('created', { playerId, room });
      // send initial lobby state to creator and all other players (sanitized)
      emitSanitizedState(game);
    });

    // Helper: emit a sanitized per-player state: each player receives only their
    // board (with the active piece merged in) and minimal info about opponents
    // (spectrum, name, isAlive). Do not expose sharedQueue, nextQueue, or activePiece.
    function emitSanitizedState(game: any) {
      if (!game) return;
      const full = game.state;
      // simple board clone
      const cloneBoard = (b: number[][]) => b.map((r: number[]) => r.slice());

      const aliveIds = Object.keys(full.players).filter((pid) => full.players[pid].isAlive);
      const winnerId = aliveIds.length === 1 ? aliveIds[0] : null;

      for (const [pid, player] of game.players) {
        const sockId = player?.socketId;
        if (!sockId) continue;
        const playersObj: Record<string, any> = {};
        for (const otherId of Object.keys(full.players)) {
          const otherState = full.players[otherId];
          const otherPlayer = game.players.get(otherId);
          if (otherId === pid) {
            const merged = game.engine.renderBoardWithPiece(cloneBoard(otherState.board), otherState.activePiece);
            playersObj[otherId] = {
              board: merged,
              isAlive: otherState.isAlive,
              spectrum: otherState.spectrum,
              name: otherPlayer?.name,
            };
          } else {
            playersObj[otherId] = {
              isAlive: otherState.isAlive,
              spectrum: otherState.spectrum,
              name: otherPlayer?.name,
            };
          }
        }
        const view = { status: full.status, tick: full.tick, players: playersObj, winnerId };
        io.to(sockId).emit('state', { state: view, hostId: game.hostId });
      }
    }

    // Join an existing lobby by passcode
    socket.on('join', (payload: { room: string; name: string }) => {
      logger.info('join a game', payload);
      const room = payload.room?.trim() ?? '';
      const name = payload.name || 'anon';
      if (!room) {
        socket.emit('join_failed', { code: 'INVALID_PASSCODE', message: 'Invalid passcode' });
        return;
      }

      const game = manager.getGame(room);
      if (!game) {
        socket.emit('join_failed', { code: 'ROOM_NOT_FOUND', message: 'Room not found', room });
        return;
      }
      if (game.state.status !== 'waiting') {
        socket.emit('join_failed', { code: 'GAME_STARTED', message: 'Game already started' });
        return;
      }

      const playerId: string = randomUUID();
      const sid = String(socket.id);
      const player = new Player(playerId, name, sid);
      game.addPlayer(player);
      void socket.join(room);
      emitSanitizedState(game);
      socket.emit('joined', { playerId, room });
    });

    socket.on('intent', (payload: { room: string; playerId: string; intent: Intent }) => {
      const game = manager.getGame(payload.room);
      if (!game) return;
      game.applyInput(payload.playerId, payload.intent);
      emitSanitizedState(game);
    });

    socket.on('start', (payload: { room: string; playerId: string }) => {
      logger.info('start a game');
      const room = payload.room;
      const playerId = payload.playerId;
      const game = manager.getGame(room);
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
      const TICK_RATE = 10; // ticks per second

      // track previous alive state to emit game over messages
      const prevAlive: Record<string, boolean> = {};
      for (const [id, p] of game.players) prevAlive[id] = Boolean(game.state.players[id]?.isAlive);

      const interval = setInterval(() => {
        try {
          // tick game
          game.tick();

          // compute alive and dead players
          const aliveIds = Object.keys(game.state.players).filter((pid) => game.state.players[pid].isAlive);
          const deadIds = Object.keys(game.state.players).filter((pid) => !game.state.players[pid].isAlive);
          logger.debug(`server: aliveIds=${aliveIds.length}`, aliveIds);
          logger.debug(`server: deadIds=${deadIds.length}`, deadIds);

          // notify newly-dead players (compare with prevAlive)
          for (const id of deadIds) {
            const wasAlive = prevAlive[id];
            if (wasAlive) {
              logger.info(`server: player ${id} transitioned alive->dead`);
              const p = game.players.get(id);
              if (p?.socketId) {
                logger.info(`server: emitting game_over to ${p.socketId} for player ${id}`);
                io.to(p.socketId).emit('game_over', { message: 'game over' });
              }
            }
            prevAlive[id] = false;
          }

          // broadcast sanitized per-player state
          emitSanitizedState(game);

          // if finished (0 or 1 alive), notify winner or broadcast game over, stop and cleanup
          if (game.state.status === 'finished' || aliveIds.length <= 1) {
            if (aliveIds.length === 1) {
              const winnerId = aliveIds[0];
              logger.info(`server: winner detected: ${winnerId}`);
              const winnerPlayer = game.players.get(winnerId);
              if (winnerPlayer?.socketId) {
                logger.info(`server: emitting winner to ${winnerPlayer.socketId} for player ${winnerId}`);
                io.to(winnerPlayer.socketId).emit('winner', { message: 'winner winner chicken dinner' });
              }
              // notify losers as well
              for (const id of Object.keys(game.state.players)) {
                if (id === winnerId) continue;
                const p = game.players.get(id);
                if (p?.socketId) {
                  logger.info(`server: emitting game_over to ${p.socketId} for player ${id}`);
                  io.to(p.socketId).emit('game_over', { message: 'game over' });
                }
              }
            } else if (aliveIds.length === 0) {
              logger.info('server: no alive players at end of game');
              // no winners, notify all of game over
              for (const id of Object.keys(game.state.players)) {
                const p = game.players.get(id);
                if (p?.socketId) {
                  logger.info(`server: emitting game_over to ${p.socketId} for player ${id}`);
                  io.to(p.socketId).emit('game_over', { message: 'game over' });
                }
              }
            }

            clearInterval(interval);
            // emit final sanitized state
            emitSanitizedState(game);
            // cleanup
            manager.removeGame(room);
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
    });
  });
}
