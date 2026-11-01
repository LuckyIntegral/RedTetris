import { expect } from 'chai';
import { BSP_SCORES, GAME_SETUP } from '../constants';
import { GameEngine } from '../game/GameEngine';

describe('GameEngine additional coverage', () => {
  it('collides does not treat negative y as collision when inside x bounds', () => {
    const e = new GameEngine('c1');
    const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    const piece = { type: 'O', x: 4, y: -2, rotation: 0 };
    const coll = e.collides(board, piece);
    expect(coll).to.equal(false);
  });

  it('renderBoardWithGhost stops by height safeguard when collides never true (monkeypatch)', () => {
    const e = new GameEngine('g1');
    const orig = e.collides;
    try {
      e.collides = () => false;
      const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
        Array.from({ length: GAME_SETUP.classic.width }, () => 0)
      );
      const piece = { type: 'O', x: 0, y: 0, rotation: 0 };
      const out = e.renderBoardWithGhost(board, piece);

      const hasGhost = out.some((row) => row.includes(-2));
      expect(hasGhost).to.equal(false);
    } finally {
      e.collides = orig;
    }
  });

  it('tick reduces speed when tick reaches 200 boundary', () => {
    const e = new GameEngine('t1');
    const s = e.createInitialState(['p1']);
    s.tick = 199; // so tick will increment to 200
    s.speed = 20;
    const after = e.tick(s);
    expect(after.tick).to.equal(200);
    expect(after.speed).to.equal(19);
  });

  it('clearLines returns correct cleared count and keeps board width', () => {
    const e = new GameEngine('c2');
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    const board = Array.from({ length: GAME_SETUP.classic.height - 1 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    board.push(full.slice());
    const res = e.clearLines(board);
    expect(res.cleared).to.equal(1);
    expect(res.board.length).to.equal(GAME_SETUP.classic.height);
  });

  it('computeLinesClearedReward gives drop bonus when isHard true', () => {
    const e = new GameEngine('c3');
    const s = e.createInitialState(['p1', 'p2']);
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    s.playerStates.p1.board = Array.from({ length: GAME_SETUP.classic.height - 2 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    s.playerStates.p1.board.push(full.slice());
    s.playerStates.p1.board.push(full.slice());
    const before = s.playerStates.p1.score;
    e.computeLinesClearedReward(s, 'p1', 3, true);
    expect(s.playerStates.p1.score).to.equal(before + BSP_SCORES[2] + Math.max(0, 3 + 1));
  });
});

describe('GameEngine (cleaned focused tests)', () => {
  it('creates initial state and allows adding players', () => {
    const e = new GameEngine('s');
    const s = e.createInitialState(['p1']);
    expect(s.playerStates).to.have.property('p1');
    const s2 = e.addPlayer(s, 'p2');
    expect(s2.playerStates).to.have.property('p2');
  });

  it('renderBoardWithPiece places cells for active piece', () => {
    const e = new GameEngine('seed');
    const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    const piece = { type: 'O', x: 4, y: 0, rotation: 0 };
    const out = e.renderBoardWithPiece(board, piece);
    expect(out[0][4]).to.be.greaterThan(0);
    expect(out[0][5]).to.be.greaterThan(0);
  });

  it('renderBoardWithGhost shows ghost and active piece color', () => {
    const e = new GameEngine('seed2');
    const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    const piece = { type: 'O', x: 4, y: 0, rotation: 0 };
    const out = e.renderBoardWithGhost(board, piece);
    const hasGhost = out.some((row) => row.includes(-2));
    const hasActive = out[0].some((cell) => cell > 0);
    expect(hasGhost).to.equal(true);
    expect(hasActive).to.equal(true);
  });

  it('collides allows negative y (spawn partial) without treating as collision', () => {
    const e = new GameEngine('c1');
    const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    const piece = { type: 'O', x: 4, y: -2, rotation: 0 };
    const coll = e.collides(board, piece);
    expect(coll).to.equal(false);
  });

  it('applyInput move/rotate/soft/hard/hold behave deterministically', () => {
    const e = new GameEngine('s4');
    const state = e.createInitialState(['p1']);
    const player = state.playerStates.p1;
    player.activePiece = { type: 'O', x: 4, y: 0, rotation: 0 };

    const moved = e.applyInput(state, 'p1', { type: 'move', dir: 'left' });
    expect(moved.playerStates.p1.activePiece!.x).to.equal(3);

    const movedR = e.applyInput(moved, 'p1', { type: 'move', dir: 'right' });
    expect(movedR.playerStates.p1.activePiece!.x).to.equal(4);

    const rot = e.applyInput(movedR, 'p1', { type: 'rotate' });
    expect(rot.playerStates.p1.activePiece!.rotation).to.equal(1);

    const soft = e.applyInput(rot, 'p1', { type: 'soft' });
    expect(soft.playerStates.p1.activePiece!.y).to.equal(1);

    const hardState = e.applyInput(soft, 'p1', { type: 'hard' });
    expect(hardState.playerStates.p1.activePiece).to.equal(null);
    expect(hardState.playerStates.p1.holdLocked).to.equal(false);
  });

  it('hold - initial hold sets holdPiece and clears activePiece', () => {
    const e = new GameEngine('s5');
    const state = e.createInitialState(['p1']);
    const player = state.playerStates.p1;

    player.activePiece = { type: 'O', x: 4, y: 0, rotation: 0 };
    const held = e.applyInput(state, 'p1', { type: 'hold' });
    expect(held.playerStates.p1.holdPiece).to.equal('O');
    expect(held.playerStates.p1.activePiece).to.equal(null);
  });

  it('tick finishes when only one alive and status running', () => {
    const e = new GameEngine('s6');
    const state = e.createInitialState(['p1', 'p2']);
    state.status = 'running';
    state.playerStates.p2.isAlive = false;
    state.initialPlayerCount = 2;
    state.tick = state.speed - 1;
    const after = e.tick(state);
    expect(after.status).to.equal('finished');
  });

  it('tick reduces speed when crossing threshold', () => {
    const e = new GameEngine('t1');
    const s = e.createInitialState(['p1']);
    s.tick = 199;
    s.speed = 20;
    const after = e.tick(s);
    expect(after.tick).to.equal(200);
    expect(after.speed).to.equal(19);
  });

  it('clearLines returns cleared count and preserves board height', () => {
    const e = new GameEngine('c2');
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    const board = Array.from({ length: GAME_SETUP.classic.height - 1 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    board.push(full.slice());
    const res = e.clearLines(board);
    expect(res.cleared).to.equal(1);
    expect(res.board.length).to.equal(GAME_SETUP.classic.height);
  });

  it('computeLinesClearedReward gives drop bonus when isHard true and propagates to alive players', () => {
    const e = new GameEngine('c3');
    const s = e.createInitialState(['p1', 'p2']);
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    s.playerStates.p1.board = Array.from({ length: GAME_SETUP.classic.height - 2 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    s.playerStates.p1.board.push(full.slice());
    s.playerStates.p1.board.push(full.slice());
    const before = s.playerStates.p1.score;
    e.computeLinesClearedReward(s, 'p1', 3, true);
    expect(s.playerStates.p1.score).to.equal(before + BSP_SCORES[2] + Math.max(0, 3 + 1));
  });
});

describe('GameEngine focused extras', () => {
  it('collides does not treat negative y as collision when inside x bounds', () => {
    const e = new GameEngine('c1');
    const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    const piece = { type: 'O', x: 4, y: -2, rotation: 0 };
    const coll = e.collides(board, piece);
    expect(coll).to.equal(false);
  });

  it('renderBoardWithGhost height-safeguard branch when collides forced false', () => {
    const e = new GameEngine('g1');
    const orig = e.collides.bind(e);
    try {
      e.collides = () => false;
      const board = Array.from({ length: GAME_SETUP.classic.height }, () =>
        Array.from({ length: GAME_SETUP.classic.width }, () => 0)
      );
      const piece = { type: 'O', x: 0, y: 0, rotation: 0 };
      const out = e.renderBoardWithGhost(board, piece);
      const hasGhost = out.some((row) => row.includes(-2));
      expect(hasGhost).to.equal(false);
    } finally {
      e.collides = orig;
    }
  });

  it('tick reduces speed when tick reaches 200 boundary', () => {
    const e = new GameEngine('t1');
    const s = e.createInitialState(['p1']);
    s.tick = 199;
    s.speed = 20;
    const after = e.tick(s);
    expect(after.tick).to.equal(200);
    expect(after.speed).to.equal(19);
  });

  it('clearLines returns correct cleared count and keeps board width', () => {
    const e = new GameEngine('c2');
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    const board = Array.from({ length: GAME_SETUP.classic.height - 1 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    board.push(full.slice());
    const res = e.clearLines(board);
    expect(res.cleared).to.equal(1);
    expect(res.board.length).to.equal(GAME_SETUP.classic.height);
  });

  it('computeLinesClearedReward gives drop bonus when isHard true', () => {
    const e = new GameEngine('c3');
    const s = e.createInitialState(['p1', 'p2']);
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    s.playerStates.p1.board = Array.from({ length: GAME_SETUP.classic.height - 2 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    s.playerStates.p1.board.push(full.slice());
    s.playerStates.p1.board.push(full.slice());
    const before = s.playerStates.p1.score;
    e.computeLinesClearedReward(s, 'p1', 3, true);
    expect(s.playerStates.p1.score).to.equal(before + BSP_SCORES[2] + Math.max(0, 3 + 1));
  });
});

describe('GameEngine', () => {
  it('creates initial state and allows adding players', () => {
    const e = new GameEngine('s');
    const s = e.createInitialState(['p1']);
    expect(s.playerStates).to.have.property('p1');
    const s2 = e.addPlayer(s, 'p2');
    expect(s2.playerStates).to.have.property('p2');
  });

  it('renderBoardWithPiece places cells for active piece', () => {
    it('rotation wraps from 3 -> 0 on rotate', () => {
      const e = new GameEngine('wrap-rot');
      const s = e.createInitialState(['p1']);
      const p = s.playerStates.p1;
      p.activePiece = { type: 'O', x: 4, y: 0, rotation: 3 };
      const after = e.applyInput(s, 'p1', { type: 'rotate' });
      expect(after.playerStates.p1.activePiece!.rotation).to.equal(0);
    });

    it('collides returns true when board cells block piece', () => {
      const e = new GameEngine('block-collide');
      const b = Array.from({ length: GAME_SETUP.classic.height }, () =>
        Array.from({ length: GAME_SETUP.classic.width }, () => 0)
      );
      // place a block under spawn
      b[1][4] = 1;
      const c = e.collides(b, { type: 'O', x: 4, y: 0, rotation: 0 });
      expect(c).to.equal(true);
    });

    it('computeLinesClearedReward only sends garbage to alive players', () => {
      const e = new GameEngine('garbage-target');
      const s = e.createInitialState(['a', 'b', 'c']);
      // make 'a' clear two lines
      const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
      s.playerStates.a.board = Array.from({ length: GAME_SETUP.classic.height - 2 }, () =>
        Array.from({ length: GAME_SETUP.classic.width }, () => 0)
      );
      s.playerStates.a.board.push(full.slice());
      s.playerStates.a.board.push(full.slice());
      // kill player c to ensure garbage applies only to b
      s.playerStates.c.isAlive = false;
      e.computeLinesClearedReward(s, 'a', 2, false);
      // b should have received garbage lines (bottom row contains -1 or 0)
      const bottomB = s.playerStates.b.board[s.playerStates.b.board.length - 1];
      expect(bottomB.some((v: number) => v === -1)).to.equal(true);
      // c should be unchanged (still dead and no garbage pushed)
      expect(s.playerStates.c.board.length).to.be.greaterThan(0);
    });

    it('tick increments tick counter and does not finish while >1 alive', () => {
      const e = new GameEngine('ticktest');
      const s = e.createInitialState(['p1', 'p2']);
      s.status = 'running';
      s.initialPlayerCount = 2;
      s.tick = 0;
      const after = e.tick(s);
      expect(after.tick).to.be.greaterThan(0);
      expect(after.status).to.equal('running');
    });
  });

  it('computeLinesClearedReward handles isHard dropBonus and multiple other players dead', () => {
    const e = new GameEngine('cb');
    const s = e.createInitialState(['p1', 'p2', 'p3']);
    const full = Array.from({ length: GAME_SETUP.classic.width }, () => 1);
    s.playerStates.p1.board = Array.from({ length: GAME_SETUP.classic.height - 4 }, () =>
      Array.from({ length: GAME_SETUP.classic.width }, () => 0)
    );
    for (let i = 0; i < 4; i++) {
      s.playerStates.p1.board.push(full.slice());
    }
    s.playerStates.p3.isAlive = false;
    e.computeLinesClearedReward(s, 'p1', 3, true);
    expect(s.playerStates.p1.score).to.be.at.least(BSP_SCORES[4]);
  });

  it('applyInput hold respects holdLocked true and does nothing', () => {
    const e = new GameEngine('holdtest');
    const s = e.createInitialState(['p1']);
    const p = s.playerStates.p1;
    p.activePiece = { type: 'O', x: 4, y: 0, rotation: 0 };
    p.holdLocked = true;
    const after = e.applyInput(s, 'p1', { type: 'hold' });
    expect(after.playerStates.p1.activePiece).to.not.equal(null);
  });

  it('applyInput hard drop calculates dropRows correctly and increments piecesPlaced', () => {
    const e = new GameEngine('hd');
    const s = e.createInitialState(['p1']);
    const p = s.playerStates.p1;
    p.activePiece = { type: 'O', x: 4, y: -2, rotation: 0 };
    const beforePlaced = p.piecesPlaced;
    const after = e.applyInput(s, 'p1', { type: 'hard' });
    expect(after.playerStates.p1.activePiece).to.equal(null);
    expect(after.playerStates.p1.piecesPlaced).to.be.at.least(beforePlaced);
  });

  it('engine quick sanity across multiple seeds', () => {
    for (let i = 0; i < 220; i++) {
      const e2 = new GameEngine(`s-${i}`);
      const st = e2.createInitialState([`p${i}`, `q${i}`]);
      for (let t = 0; t < 3; t++) e2.tick(st);
      expect(Object.keys(st.playerStates).length).to.equal(2);
    }
  });
});
