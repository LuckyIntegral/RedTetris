import { describe, it, expect } from 'vitest';
import { buildPieceMeta } from '~/utils/pieceHelpers';
import { GAME_SETUP, GAME_MODES, type GameMode } from '~/constants';

describe('buildPieceMeta', () => {
  it.each(GAME_MODES)('returns shapes, colors and idColors for "%s" mode', (mode) => {
    const meta = buildPieceMeta(mode);

    expect(meta.shapes).toBeDefined();
    expect(meta.colors).toBeDefined();
    expect(meta.idColors).toBeDefined();
  });

  it('produces one shape entry per tetromino key', () => {
    const meta = buildPieceMeta('classic');
    const expectedKeys = Object.keys(GAME_SETUP.classic.tetrominos);

    expect(Object.keys(meta.shapes)).toEqual(expectedKeys);
    expect(Object.keys(meta.colors)).toEqual(expectedKeys);
  });

  it('shapes are the first rotation (index 0) of each tetromino', () => {
    const meta = buildPieceMeta('classic');
    const tetrominos = GAME_SETUP.classic.tetrominos;

    for (const key of Object.keys(tetrominos)) {
      expect(meta.shapes[key]).toEqual(tetrominos[key][0]);
    }
  });

  it('classic pieces get their well-known colours', () => {
    const meta = buildPieceMeta('classic');

    expect(meta.colors['I']).toBe('#0d9488');
    expect(meta.colors['O']).toBe('#ca8a04');
    expect(meta.colors['T']).toBe('#9333ea');
    expect(meta.colors['S']).toBe('#16a34a');
    expect(meta.colors['Z']).toBe('#dc2626');
    expect(meta.colors['J']).toBe('#2563eb');
    expect(meta.colors['L']).toBe('#c2410c');
  });

  it('non-classic pieces fall back to the palette', () => {
    const meta = buildPieceMeta('pentominoes');
    const tetrominos = GAME_SETUP.pentominoes.tetrominos;
    const keys = Object.keys(tetrominos);

    // pentominoes have keys beyond I/O/T/S/Z/J/L — those should get palette colours
    const nonClassic = keys.filter((k) => !['I', 'O', 'T', 'S', 'Z', 'J', 'L'].includes(k));
    expect(nonClassic.length).toBeGreaterThan(0);

    for (const k of nonClassic) {
      expect(meta.colors[k]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('idColors[0] is always black (#000000)', () => {
    for (const mode of GAME_MODES) {
      const meta = buildPieceMeta(mode);
      expect(meta.idColors[0]).toBe('#000000');
    }
  });

  it('idColors has length = 1 + number of piece keys (up to 15)', () => {
    for (const mode of GAME_MODES) {
      const meta = buildPieceMeta(mode);
      const keyCount = Math.min(Object.keys(GAME_SETUP[mode].tetrominos).length, 15);
      expect(meta.idColors).toHaveLength(1 + keyCount);
    }
  });

  it('idColors[1..n] match the corresponding piece colour', () => {
    const meta = buildPieceMeta('classic');
    const keys = Object.keys(GAME_SETUP.classic.tetrominos);

    keys.forEach((k, i) => {
      expect(meta.idColors[i + 1]).toBe(meta.colors[k]);
    });
  });

  it('returns the same structure for every mode', () => {
    for (const mode of GAME_MODES) {
      const meta = buildPieceMeta(mode);
      expect(Array.isArray(meta.idColors)).toBe(true);
      expect(typeof meta.shapes).toBe('object');
      expect(typeof meta.colors).toBe('object');

      // every shape should be a 2D number array
      for (const shape of Object.values(meta.shapes)) {
        expect(Array.isArray(shape)).toBe(true);
        expect(shape.length).toBeGreaterThan(0);
        for (const row of shape) {
          expect(Array.isArray(row)).toBe(true);
        }
      }
    }
  });
});
