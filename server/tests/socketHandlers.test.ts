/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import sinon from 'sinon';
import { Server, Socket } from 'socket.io';

import { GameManager } from '../core/GameManager';
import { Player } from '../core/Player';
import { registerSocketHandlers } from '../net/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socketEvents';
import { logger } from '../utils/logger';

type TestSocket = Socket<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>;
type TestServer = Server<ClientToServerEvents, ServerToClientEvents, ServerToClientEvents, SocketData>;

type EventCallback = (...args: unknown[]) => unknown;
type EventMap = Map<string, EventCallback>;

function makeFakeSocket(id = 'sock1'): TestSocket & { trigger: (ev: string, payload?: unknown) => unknown } {
  const events: EventMap = new Map();
  return {
    id,
    data: {} as SocketData,
    emit: sinon.stub(),
    join: sinon.stub().resolves(undefined),
    on: (ev: string, cb: EventCallback) => events.set(ev, cb),
    trigger: (ev: string, payload?: unknown) => {
      const cb = events.get(ev);
      if (!cb) throw new Error('no handler for ' + ev);
      return cb(payload);
    },
  } as unknown as TestSocket & { trigger: (ev: string, payload?: unknown) => unknown };
}

function makeFakeIO(): TestServer & { simulateConnection: (sock: TestSocket) => void } {
  let connectionHandler: ((sock: TestSocket) => void) | undefined;
  const toMap = new Map<string, { emit: sinon.SinonStub }>();
  return {
    on: (ev: string, cb: (sock: TestSocket) => void) => {
      if (ev === 'connection') connectionHandler = cb;
    },
    simulateConnection: (sock: TestSocket) => {
      if (connectionHandler) connectionHandler(sock);
    },
    to: (id: string) => {
      if (!toMap.has(id)) toMap.set(id, { emit: sinon.stub() });
      return toMap.get(id)!;
    },
  } as unknown as TestServer & { simulateConnection: (sock: TestSocket) => void };
}

describe('socket handlers', () => {
  let io: ReturnType<typeof makeFakeIO>;
  let socket: ReturnType<typeof makeFakeSocket>;
  let manager: GameManager;
  let setIntervalStub: sinon.SinonStub;
  let clearIntervalStub: sinon.SinonStub;
  let capturedIntervalCb: (() => void) | null = null;

  beforeEach(() => {
    capturedIntervalCb = null;
    setIntervalStub = sinon.stub(global, 'setInterval').callsFake((...args: unknown[]) => {
      const fn = args[0] as () => void;
      capturedIntervalCb = fn;
      return { _fakeTimer: true } as unknown as NodeJS.Timeout;
    });
    clearIntervalStub = sinon.stub(global, 'clearInterval').callsFake(() => undefined);

    io = makeFakeIO();
    socket = makeFakeSocket('socket-1');
    manager = new GameManager();

    sinon.stub(logger, 'info');
    sinon.stub(logger, 'error');

    registerSocketHandlers(io, manager);
    io.simulateConnection(socket);
  });

  afterEach(() => {
    setIntervalStub.restore();
    clearIntervalStub.restore();
    (logger.info as sinon.SinonStub).restore();
    (logger.error as sinon.SinonStub).restore();
  });

  it('create emits create_failed when unauthenticated', async () => {
    await socket.trigger('create');
    expect((socket.emit as sinon.SinonStub).called).to.be.true;
    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('create_failed');
    expect(call.args[1]).to.have.property('code', 'NOT_AUTHENTICATED');
  });

  it('create emits created and state when authenticated', async () => {
    socket.data.user = { userId: 123, username: 'alice' };

    await socket.trigger('create');

    const createdCall = (socket.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'created');
    expect(createdCall).to.exist;
    expect(createdCall!.args[1]).to.have.property('roomId');

    const payload = createdCall!.args[1] as { roomId: string };
    const roomId = payload.roomId;
    const game = manager.getGame(roomId);
    expect(game).to.exist;
    expect(game!.hostId).to.equal('123');
  });

  it('join emits join_failed when room not found', async () => {
    socket.data.user = { userId: 5, username: 'bob' };
    await socket.trigger('join', { roomId: 'nope' });
    expect((socket.emit as sinon.SinonStub).called).to.be.true;
    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('join_failed');
    expect(call.args[1]).to.have.property('code', 'ROOM_NOT_FOUND');
  });

  it('join succeeds when authenticated and room waiting', async () => {
    const host = new Player('host1', 'host', 'socket-host');
    const game = manager.createNewGame(host);
    game.state.status = 'waiting';

    socket.data.user = { userId: 7, username: 'carol' };
    await socket.trigger('join', { roomId: game.id });

    expect((socket.join as sinon.SinonStub).called).to.be.true;
    const joinedCall = (socket.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'joined');
    expect(joinedCall).to.exist;
    expect(joinedCall!.args[1]).to.have.property('roomId', game.id);
  });

  it('intent applies input and emits state when authenticated', async () => {
    const host = new Player('9', 'dan', 'socket-1');
    const game = manager.createNewGame(host);
    game.state.status = 'running';

    socket.data.user = { userId: 9, username: 'dan' };
    await socket.trigger('intent', { roomId: game.id, intent: { type: 'left' } });

    const toObj = io.to('socket-1');
    expect((toObj.emit as sinon.SinonStub).called).to.be.true;
  });

  it('start as host starts loop and emits game_over/winner on tick', async () => {
    const host = new Player('1', 'host', 'socket-1');
    const game = manager.createNewGame(host);
    game.state.status = 'waiting';

    const other = new Player('2', 'other', 'socket-2');
    game.addPlayer(other);

    socket.data.user = { userId: 1, username: 'host' };
    await socket.trigger('start', { roomId: game.id });

    expect(setIntervalStub.called).to.be.true;
    expect(capturedIntervalCb).to.be.a('function');

    game.state.playerStates['2'].isAlive = false;
    capturedIntervalCb!();

    const toOther = io.to('socket-2');
    const gameOverCall = (toOther.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'game_over');
    expect(gameOverCall).to.exist;

    const toHost = io.to('socket-1');
    const winnerCall = (toHost.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'winner');
    expect(winnerCall).to.exist;
  });

  it('restart resets engine and emits restarted', async () => {
    const host = new Player('2', 'host2', 'socket-1');
    const game = manager.createNewGame(host);
    game.state.status = 'running';

    socket.data.user = { userId: 2, username: 'host2' };
    await socket.trigger('restart', { roomId: game.id });

    const toRoom = io.to(game.id);
    expect((toRoom.emit as sinon.SinonStub).called).to.be.true;
    const restarted = (toRoom.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'restarted');
    expect(restarted).to.exist;
  });

  it('disconnect removes player and removes game when no players left', async () => {
    const host = new Player('only', 'solo', 'socket-1');
    const game = manager.createNewGame(host);

    await socket.trigger('disconnect');

    expect(manager.getGame(game.id)).to.be.undefined;
  });

  it('start emits join_failed when unauthenticated', async () => {
    await socket.trigger('start', { roomId: 'anything' });
    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('join_failed');
    expect(call.args[1]).to.have.property('code', 'NOT_AUTHENTICATED');
  });

  it('start emits start_failed NOT_HOST when non-host tries to start', async () => {
    const host = new Player('100', 'host', 'socket-host');
    const game = manager.createNewGame(host);
    game.state.status = 'waiting';

    socket.data.user = { userId: 999, username: 'other' };
    await socket.trigger('start', { roomId: game.id });

    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('start_failed');
    expect(call.args[1]).to.have.property('code', 'NOT_HOST');
  });

  it('start emits start_failed ALREADY_STARTED when game running', async () => {
    const host = new Player('3', 'host3', 'socket-1');
    const game = manager.createNewGame(host);
    game.state.status = 'running';

    socket.data.user = { userId: 3, username: 'host3' };
    await socket.trigger('start', { roomId: game.id });

    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('start_failed');
    expect(call.args[1]).to.have.property('code', 'ALREADY_STARTED');
  });

  it('join emits join_failed GAME_STARTED when game already started', async () => {
    const host = new Player('1', 'h', 's');
    const game = manager.createNewGame(host);
    game.state.status = 'running';

    socket.data.user = { userId: 10, username: 'late' };
    await socket.trigger('join', { roomId: game.id });

    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('join_failed');
    expect(call.args[1]).to.have.property('code', 'GAME_STARTED');
  });

  it('restart emits restart_failed INVALID_ROOM when room not found', async () => {
    socket.data.user = { userId: 1, username: 'u' };
    await socket.trigger('restart', { roomId: 'nope' });

    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('restart_failed');
    expect(call.args[1]).to.have.property('code', 'INVALID_ROOM');
  });

  it('restart emits restart_failed NOT_HOST when non-host tries', async () => {
    const host = new Player('hx', 'hx', 'sx');
    const game = manager.createNewGame(host);

    socket.data.user = { userId: 999, username: 'nothost' };
    await socket.trigger('restart', { roomId: game.id });

    const call = (socket.emit as sinon.SinonStub).getCall(0);
    expect(call.args[0]).to.equal('restart_failed');
    expect(call.args[1]).to.have.property('code', 'NOT_HOST');
  });

  it('single player game emits game_over when player dies', async () => {
    const solo = new Player('50', 'solo', 'socket-1');
    const game = manager.createNewGame(solo);
    game.state.status = 'waiting';

    socket.data.user = { userId: 50, username: 'solo' };
    await socket.trigger('start', { roomId: game.id });

    expect(capturedIntervalCb).to.be.a('function');

    game.state.playerStates['50'].isAlive = false;
    capturedIntervalCb!();

    const toSolo = io.to('socket-1');
    const gameOverCall = (toSolo.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'game_over');
    expect(gameOverCall).to.exist;
  });

  it('disconnect transfers host to remaining player when host leaves', async () => {
    const host = new Player('hleave', 'hleave', 'socket-1');
    const game = manager.createNewGame(host);
    game.state.status = 'waiting';

    const other = new Player('stay', 'stay', 'socket-2');
    game.addPlayer(other);

    await socket.trigger('disconnect');

    expect(game.hostId).to.equal('stay');
    const toRoom = io.to(game.id);
    const hostChangedCall = (toRoom.emit as sinon.SinonStub)
      .getCalls()
      .find((c: sinon.SinonSpyCall) => c.args[0] === 'host_changed');
    expect(hostChangedCall).to.exist;
  });

  it('tick catches errors and logs them', async () => {
    const host = new Player('99', 'herr', 'socket-1');
    const game = manager.createNewGame(host);
    game.state.status = 'waiting';

    sinon.stub(game, 'tick').throws(new Error('boom'));

    socket.data.user = { userId: 99, username: 'herr' };
    await socket.trigger('start', { roomId: game.id });

    expect(capturedIntervalCb).to.be.a('function');
    expect(() => capturedIntervalCb!()).to.not.throw();
    expect((logger.error as sinon.SinonStub).called).to.be.true;
  });
});
