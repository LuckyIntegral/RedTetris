/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import sinon from 'sinon';
import { Server, Socket } from 'socket.io';

import { GameManager } from '../core/GameManager';
import { Player } from '../core/Player';
import {
  MAX_EVENTS_PER_SECOND,
  MAX_PLAYERS_PER_ROOM,
  MAX_ROOM_ACTIONS_PER_MINUTE,
  MAX_SOCKETS_PER_USER,
  registerSocketHandlers,
} from '../net/socketHandlers';
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
    leave: sinon.stub().resolves(undefined),
    disconnect: sinon.stub(),
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
    await socket.trigger('intent', { roomId: game.id, intent: { type: 'move', dir: 'left' } });

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

describe('socket handlers: hardening', () => {
  let io: ReturnType<typeof makeFakeIO>;
  let manager: GameManager;
  let clock: sinon.SinonFakeTimers;

  const connect = (id: string, user?: { userId: number; username: string }) => {
    const sock = makeFakeSocket(id);
    if (user) sock.data.user = user;
    io.simulateConnection(sock);
    return sock;
  };
  const emitted = (sock: ReturnType<typeof makeFakeSocket>, event: string) =>
    (sock.emit as sinon.SinonStub).getCalls().filter((c) => c.args[0] === event);

  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: 1_000_000, toFake: ['Date', 'setInterval', 'clearInterval'] });
    io = makeFakeIO();
    manager = new GameManager();
    sinon.stub(logger, 'info');
    sinon.stub(logger, 'warn');
    sinon.stub(logger, 'error');
    registerSocketHandlers(io, manager);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('survives malformed payloads instead of crashing the process', async () => {
    const sock = connect('s1', { userId: 1, username: 'eve' });
    for (const event of ['create', 'join', 'intent', 'start', 'restart']) {
      for (const payload of [null, 42, 'x', [], { roomId: { $ne: 1 } }, { roomId: 'A'.repeat(100000) }]) {
        await sock.trigger(event, payload);
      }
    }
    expect(emitted(sock, 'create_failed')[0].args[1]).to.include({ code: 'INVALID_MODE' });
    expect(emitted(sock, 'join_failed').every((c) => (c.args[1] as { code: string }).code === 'ROOM_NOT_FOUND')).to.be
      .true;
    // an object without `mode` still means classic, as before
    expect([...manager.games.values()].every((g) => g.mode === 'classic')).to.be.true;
  });

  it('rejects unknown game modes and intents', async () => {
    const sock = connect('s1', { userId: 1, username: 'eve' });
    await sock.trigger('create', { mode: '__proto__' });
    expect(emitted(sock, 'create_failed')[0].args[1]).to.include({ code: 'INVALID_MODE' });

    await sock.trigger('create', { mode: 'narrow' });
    const game = [...manager.games.values()][0];
    game.state.status = 'running';
    const applyInput = sinon.spy(game, 'applyInput');
    await sock.trigger('intent', { roomId: game.id, intent: { type: 'teleport' } });
    await sock.trigger('intent', { roomId: game.id, intent: { type: 'move', dir: 'up' } });
    expect(applyInput.called).to.be.false;
  });

  it('ignores intents from users who are not in the room', async () => {
    const host = connect('s-host', { userId: 1, username: 'host' });
    await host.trigger('create', { mode: 'classic' });
    const game = [...manager.games.values()][0];
    game.state.status = 'running';
    const applyInput = sinon.spy(game, 'applyInput');

    const outsider = connect('s-out', { userId: 2, username: 'mallory' });
    await outsider.trigger('intent', { roomId: game.id, intent: { type: 'hard' } });
    expect(applyInput.called).to.be.false;

    await host.trigger('intent', { roomId: game.id, intent: { type: 'hard' } });
    expect(applyInput.calledOnce).to.be.true;
  });

  it('accepts room codes in any case and with surrounding spaces', async () => {
    const host = connect('s-host', { userId: 1, username: 'host' });
    await host.trigger('create', { mode: 'classic' });
    const game = [...manager.games.values()][0];

    const guest = connect('s-guest', { userId: 2, username: 'guest' });
    await guest.trigger('join', { roomId: ` ${game.id.toLowerCase()} ` });
    expect(emitted(guest, 'joined')[0].args[1]).to.deep.equal({ roomId: game.id });
  });

  it('drops events above the per-socket rate limit', async () => {
    const sock = connect('s1', { userId: 1, username: 'spammer' });
    for (let i = 0; i < MAX_EVENTS_PER_SECOND + 20; i++) {
      await sock.trigger('join', { roomId: 'ABCDEF' });
    }
    // join itself is also limited per user, so count every reply
    const replies = emitted(sock, 'join_failed').length;
    expect(replies).to.equal(MAX_EVENTS_PER_SECOND);

    clock.tick(1000);
    await sock.trigger('join', { roomId: 'ABCDEF' });
    expect(emitted(sock, 'join_failed').length).to.equal(replies + 1);
  });

  it('limits room creation and joins per user', async () => {
    const sock = connect('s1', { userId: 1, username: 'builder' });
    for (let i = 0; i < MAX_ROOM_ACTIONS_PER_MINUTE; i++) {
      await sock.trigger('create', { mode: 'classic' });
    }
    await sock.trigger('create', { mode: 'classic' });
    const failures = emitted(sock, 'create_failed');
    expect(failures[failures.length - 1].args[1]).to.include({ code: 'RATE_LIMITED' });

    clock.tick(60_000);
    await sock.trigger('create', { mode: 'classic' });
    expect(emitted(sock, 'created').length).to.equal(MAX_ROOM_ACTIONS_PER_MINUTE + 1);
  });

  it('keeps each socket in one room, so old rooms are cleaned up', async () => {
    const sock = connect('s1', { userId: 1, username: 'hopper' });
    await sock.trigger('create', { mode: 'classic' });
    await sock.trigger('create', { mode: 'classic' });
    await sock.trigger('create', { mode: 'classic' });
    expect(manager.games.size).to.equal(1);
  });

  it(`caps rooms at ${MAX_PLAYERS_PER_ROOM} players`, async () => {
    const host = connect('s0', { userId: 100, username: 'host' });
    await host.trigger('create', { mode: 'classic' });
    const game = [...manager.games.values()][0];

    for (let i = 1; i < MAX_PLAYERS_PER_ROOM; i++) {
      await connect(`s${i}`, { userId: 100 + i, username: `p${i}` }).trigger('join', { roomId: game.id });
    }
    expect(game.getPlayers().length).to.equal(MAX_PLAYERS_PER_ROOM);

    const late = connect('s-late', { userId: 999, username: 'late' });
    await late.trigger('join', { roomId: game.id });
    expect(emitted(late, 'join_failed')[0].args[1]).to.include({ code: 'ROOM_FULL' });
  });

  it(`disconnects sockets beyond ${MAX_SOCKETS_PER_USER} per user and frees the slot on disconnect`, async () => {
    const user = { userId: 7, username: 'tabs' };
    const sockets = Array.from({ length: MAX_SOCKETS_PER_USER }, (_, i) => connect(`t${i}`, user));
    const extra = connect('t-extra', user);
    expect((extra.disconnect as sinon.SinonStub).calledOnce).to.be.true;
    sockets.forEach((s) => expect((s.disconnect as sinon.SinonStub).called).to.be.false);

    await sockets[0].trigger('disconnect');
    const replacement = connect('t-new', user);
    expect((replacement.disconnect as sinon.SinonStub).called).to.be.false;
  });

  it('logs a failing handler instead of throwing', async () => {
    const sock = connect('s1', { userId: 1, username: 'eve' });
    sinon.stub(manager, 'createNewGame').throws(new Error('boom'));
    await sock.trigger('create', { mode: 'classic' });
    expect((logger.error as sinon.SinonStub).calledWithMatch('socket create handler failed')).to.be.true;
  });
});
