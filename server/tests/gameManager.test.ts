/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { GameManager } from '../core/GameManager';
import { Player } from '../core/Player';
import crypto from 'crypto';

describe('GameManager', () => {
  it('creates and stores a new game with 6-char uppercase id', () => {
    const gm = new GameManager();
    const host = new Player('p1', 'Host', 's1');
    const game = gm.createNewGame(host);

    expect(game).to.exist;
    expect(game.id).to.be.a('string');
    expect(game.id).to.have.lengthOf(6);
    expect(game.id).to.equal(game.id.toUpperCase());
    expect(gm.getGame(game.id)).to.equal(game);
    expect(gm.games.has(game.id)).to.be.true;
  });

  it('removeGame deletes the game', () => {
    const gm = new GameManager();
    const host = new Player('p2', 'Host2', 's2');
    const game = gm.createNewGame(host);
    gm.removeGame(game.id);
    expect(gm.getGame(game.id)).to.be.undefined;
    expect(gm.games.has(game.id)).to.be.false;
  });

  it('retries room code when a collision occurs', () => {
    const gm = new GameManager();
    const existingHost = new Player('h', 'Existing', 'sX');
    const pre = gm.createNewGame(existingHost);
    const collidingId = pre.id; // 6-char id produced by real generator

    const orig = crypto.randomUUID;
    let calls = 0;
    crypto.randomUUID = () => {
      calls++;
      const base = (calls === 1 ? collidingId : 'ZZZZZZ').toLowerCase();
      return `${base}-0000-0000-0000-000000000000`;
    };

    try {
      const host = new Player('p3', 'Host3', 's3');
      const game = gm.createNewGame(host);
      expect(game.id).to.equal('ZZZZZZ');
      expect(calls).to.be.greaterThan(1);
    } finally {
      crypto.randomUUID = orig;
    }
  });

  it('generates different ids for successive games', () => {
    const gm = new GameManager();
    const a = new Player('a', 'A', 'sA');
    const b = new Player('b', 'B', 'sB');
    const g1 = gm.createNewGame(a);
    const g2 = gm.createNewGame(b);
    expect(g1.id).to.not.equal(g2.id);
  });

  it('removeGame is a no-op for missing ids', () => {
    const gm = new GameManager();
    expect(() => gm.removeGame('NOEX')).to.not.throw();
  });
});
