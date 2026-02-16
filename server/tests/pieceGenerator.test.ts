import { expect } from 'chai';
import { PieceGenerator } from '../game/PieceGenerator';

describe('PieceGenerator', () => {
  const tinyTetrominos = { A: [[[1]]], B: [[[1]]] } as Record<string, number[][][]>;

  it('throws on invalid piece type', () => {
    const g = new PieceGenerator(1, tinyTetrominos);
    expect(() => g.getPieceShapeAndColor('X', 0)).to.throw(/Invalid piece type/);
  });

  it('returns shape and color and uses rotation modulo length', () => {
    const g = new PieceGenerator(1, tinyTetrominos);
    const s0 = g.getPieceShapeAndColor('A', 0);
    const s1 = g.getPieceShapeAndColor('A', 5); // rotation wraps
    expect(s0.piece).to.deep.equal(s1.piece);
    // colors are index+1 -> A is first -> 1
    expect(s0.color).to.equal(1);
  });

  it('generates deterministic sequence with given seed', () => {
    const g1 = new PieceGenerator(42, tinyTetrominos);
    const g2 = new PieceGenerator(42, tinyTetrominos);

    const seq1 = [g1.getPiece(0), g1.getPiece(1), g1.getPiece(2)];
    const seq2 = [g2.getPiece(0), g2.getPiece(1), g2.getPiece(2)];

    expect(seq1).to.deep.equal(seq2);
    expect(seq1.length).to.equal(3);
  });
});

describe('PieceGenerator exhaustive scenarios', () => {
  const tet = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
      ],
    ],
    O: [
      [
        [1, 1],
        [1, 1],
      ],
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
      ],
    ],
  } as Record<string, number[][][]>;

  it('produces a long deterministic stream for many iterations', () => {
    const seed = 12345;
    const g = new PieceGenerator(seed, tet);
    const g2 = new PieceGenerator(seed, tet);

    // request 30 pieces from each generator and compare
    const a: string[] = [];
    const b: string[] = [];
    for (let i = 0; i < 30; i++) {
      a.push(g.getPiece(i));
      b.push(g2.getPiece(i));
    }
    expect(a).to.deep.equal(b);
    expect(a.length).to.equal(30);
  });

  it('wraps rotations for all types and rotation values', () => {
    const g = new PieceGenerator(1, tet);
    for (const type of ['I', 'O', 'T']) {
      const shapes = tet[type];
      for (let rot = 0; rot < shapes.length * 3; rot++) {
        const s = g.getPieceShapeAndColor(type, rot);
        expect(s.piece).to.deep.equal(shapes[rot % shapes.length]);
        expect(s.color).to.be.a('number');
      }
    }
  });

  it('getPiece with large iteration indexes keeps generating', () => {
    const g = new PieceGenerator(999, tet);
    const res = g.getPiece(50);
    expect(['I', 'O', 'T']).to.include(res);
  });

  const seeds = [0, 1, 2, 42, 9999, 2147483646];
  for (const s of seeds) {
    it(`seed ${s} should produce all types within first 20 pieces`, () => {
      const g = new PieceGenerator(s, tet);
      const seen = new Set<string>();
      for (let i = 0; i < 20; i++) {
        seen.add(g.getPiece(i));
      }
      for (const t of ['I', 'O', 'T']) {
        expect(Array.from(seen)).to.include(t);
      }
    });
  }

  it('rotation modulo invariants across many values', () => {
    const g = new PieceGenerator(3, tet);
    for (let rot = 0; rot < 100; rot++) {
      const r = rot % tet.I.length;
      const a = g.getPieceShapeAndColor('I', rot).piece;
      const b = tet.I[r];
      expect(a).to.deep.equal(b);
    }
  });

  for (let i = 0; i < 80; i++) {
    it(`sanity check iteration ${i}`, () => {
      const g = new PieceGenerator(i + 1, tet);
      const p0 = g.getPiece(0);
      expect(typeof p0).to.equal('string');
    });
  }
});

describe('PieceGenerator focused extra', () => {
  it('assigns colors according to key insertion order', () => {
    const tet = { A: [[[1]]], B: [[[2]]], C: [[[3]]] } as Record<string, number[][][]>;
    const g = new PieceGenerator(0, tet);
    expect(g.getPieceShapeAndColor('A', 0).color).to.equal(1);
    expect(g.getPieceShapeAndColor('B', 0).color).to.equal(2);
    expect(g.getPieceShapeAndColor('C', 0).color).to.equal(3);
  });

  it('wraps extremely large rotation numbers correctly', () => {
    const tet2 = { X: [[[1, 0]], [[0, 1]]] } as Record<string, number[][][]>;
    const shapes = tet2.X;
    const g = new PieceGenerator(1, tet2);
    const rot = Number.MAX_SAFE_INTEGER;
    const expected = shapes[rot % shapes.length];
    expect(g.getPieceShapeAndColor('X', rot).piece).to.deep.equal(expected);
  });

  it('is deterministic at very large iteration indexes', () => {
    const seed = 1234567;
    const tet3 = { A: [[[1]]], B: [[[1]]] } as Record<string, number[][][]>;
    const g1 = new PieceGenerator(seed, tet3);
    const g2 = new PieceGenerator(seed, tet3);
    expect(g1.getPiece(10000)).to.equal(g2.getPiece(10000));
  });

  it('getPiece only returns known types after many draws', () => {
    const tet4 = { A: [[[1]]], B: [[[1]]], C: [[[1]]] } as Record<string, number[][][]>;
    const g = new PieceGenerator(7, tet4);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(g.getPiece(i));
    for (const k of Object.keys(tet4)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(seen.has(k)).to.be.true;
    }
  });
});
