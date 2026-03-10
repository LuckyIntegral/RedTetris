import { describe, it, expect } from 'vitest';
import { CLASSIC_TETROMINOS, CYBER_TETROMINOS, PENTOMINOES } from '~/constants/tetrominos';

describe('constants/tetrominos', () => {
  describe('CLASSIC_TETROMINOS', () => {
    it('has exactly 7 pieces (I, O, T, S, Z, J, L)', () => {
      const keys = Object.keys(CLASSIC_TETROMINOS);
      expect(keys).toHaveLength(7);
      expect(keys).toEqual(expect.arrayContaining(['I', 'O', 'T', 'S', 'Z', 'J', 'L']));
    });

    it('each piece has at least one rotation', () => {
      for (const [key, rotations] of Object.entries(CLASSIC_TETROMINOS)) {
        expect(rotations.length).toBeGreaterThanOrEqual(1);
        // O-piece has 1 rotation, others have 2-4
        if (key === 'O') {
          expect(rotations).toHaveLength(1);
        }
      }
    });

    it('each rotation is a 2D array of 0s and 1s', () => {
      for (const rotations of Object.values(CLASSIC_TETROMINOS)) {
        for (const rotation of rotations) {
          expect(Array.isArray(rotation)).toBe(true);
          for (const row of rotation) {
            expect(Array.isArray(row)).toBe(true);
            for (const cell of row) {
              expect(cell === 0 || cell === 1).toBe(true);
            }
          }
        }
      }
    });

    it('each classic piece has exactly 4 filled cells', () => {
      for (const rotations of Object.values(CLASSIC_TETROMINOS)) {
        for (const rotation of rotations) {
          const count = rotation.flat().filter((c) => c === 1).length;
          expect(count).toBe(4);
        }
      }
    });
  });

  describe('CYBER_TETROMINOS', () => {
    it('has 6 pieces', () => {
      const keys = Object.keys(CYBER_TETROMINOS);
      expect(keys).toHaveLength(6);
    });

    it('each piece has at least one rotation', () => {
      for (const rotations of Object.values(CYBER_TETROMINOS)) {
        expect(rotations.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('each rotation contains only 0s and 1s', () => {
      for (const rotations of Object.values(CYBER_TETROMINOS)) {
        for (const rotation of rotations) {
          for (const row of rotation) {
            for (const cell of row) {
              expect(cell === 0 || cell === 1).toBe(true);
            }
          }
        }
      }
    });
  });

  describe('PENTOMINOES', () => {
    it('has at least 10 pieces', () => {
      const keys = Object.keys(PENTOMINOES);
      expect(keys.length).toBeGreaterThanOrEqual(10);
    });

    it('each piece has at least one rotation', () => {
      for (const rotations of Object.values(PENTOMINOES)) {
        expect(rotations.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('each pentomino rotation has exactly 5 filled cells', () => {
      for (const rotations of Object.values(PENTOMINOES)) {
        for (const rotation of rotations) {
          const count = rotation.flat().filter((c) => c === 1).length;
          expect(count).toBe(5);
        }
      }
    });

    it('each rotation contains only 0s and 1s', () => {
      for (const rotations of Object.values(PENTOMINOES)) {
        for (const rotation of rotations) {
          for (const row of rotation) {
            for (const cell of row) {
              expect(cell === 0 || cell === 1).toBe(true);
            }
          }
        }
      }
    });
  });
});
