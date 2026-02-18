import { expect } from 'chai';
import { Game } from '../game/Game';
import { Player } from '../core/Player';

describe('Game', () => {
  it('initializes with host and sets player name in state', () => {
    const host = new Player('h1', 'Host', 's1');
    const g = new Game('game1', host);
    const state = g.getState();
    expect(g.getPlayers().length).to.equal(1);
    expect(state.playerStates.h1.name).to.equal('Host');
  });

  it('addPlayer only when waiting', () => {
    const host = new Player('h2', 'Host2', 's2');
    const g = new Game('g2', host);
    const p = new Player('p2', 'P2', 's3');
    g.addPlayer(p);
    expect(g.getPlayers().length).to.equal(2);
    g.state.status = 'running';
    const p3 = new Player('p3', 'P3', 's4');
    g.addPlayer(p3);
    expect(g.getPlayers().length).to.equal(2);
  });
});

describe('Game extended behaviors and invariants', () => {
  it('getPlayer and getPlayers reflect map state', () => {
    const host = new Player('hh', 'H', 's');
    const g = new Game('gext', host);
    const p1 = new Player('a', 'A', 's1');
    const p2 = new Player('b', 'B', 's2');
    g.addPlayer(p1);
    g.addPlayer(p2);
    const players = g.getPlayers();
    expect(players.map((p) => p.id)).to.include.members(['hh', 'a', 'b']);
    expect(g.getPlayer('a')!.name).to.equal('A');
  });

  it('tick delegates to engine and updates state', () => {
    const host = new Player('h3', 'H3', 's3');
    const g = new Game('g3', host);
    g.tick();
    expect(g.getState()).to.be.an('object');
  });

  it('game sanity suite', () => {
    for (let i = 0; i < 120; i++) {
      const host = new Player(`h${i}`, `Host${i}`, `s${i}`);
      const gg = new Game(`gid${i}`, host);
      expect(gg.getPlayers().length).to.equal(1);
      gg.addPlayer(new Player(`p${i}`, `P${i}`, `s${i}`));
      expect(gg.getPlayers().length).to.equal(2);
    }
  });
});

describe('Game focused extras', () => {
  it('getPlayer returns undefined for unknown id', () => {
    const g = new Game('gX', new Player('hX', 'HostX', 's'));
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(g.getPlayer('nope')).to.be.undefined;
  });

  it('adding a player with existing id replaces the Player in the map', () => {
    const host = new Player('hdup', 'HostDup', 's');
    const g = new Game('gdup', host);
    const replacement = new Player('hdup', 'Replacement', 's2');
    g.addPlayer(replacement);
    expect(g.getPlayer('hdup')!.name).to.equal('Replacement');
    expect(g.getPlayers().length).to.equal(1);
  });

  it('applyInput with an unknown playerId does not throw', () => {
    const g = new Game('gI', new Player('hI', 'H', 's'));
    expect(() => g.applyInput('missing', { type: 'move', dir: 'left' })).to.not.throw();
  });

  it('adding many players records names in state and increases map size', () => {
    const g = new Game('gMany', new Player('hM', 'HM', 's'));
    for (let i = 0; i < 10; i++) {
      g.addPlayer(new Player(`p${i}`, `Player${i}`, `s${i}`));
    }
    expect(g.getPlayers().length).to.equal(11);
    for (let i = 0; i < 10; i++) expect(g.getPlayer(`p${i}`)!.name).to.equal(`Player${i}`);
  });
});
