import { GAME_SETUP, type GameMode } from '../constants';

/**
 * Shared piece colour / shape helpers used by board rendering components.
 * Derived from the selected game-mode's tetromino definitions.
 */

const BASE_CLASSIC_COLORS: Record<string, string> = {
  I: '#0d9488',
  O: '#ca8a04',
  T: '#9333ea',
  S: '#16a34a',
  Z: '#dc2626',
  J: '#2563eb',
  L: '#c2410c',
};

const PALETTE = ['#60a5fa', '#f97316', '#e11d48', '#7c3aed', '#059669', '#d946ef', '#facc15', '#06b6d4'];

export interface PieceMeta {
  shapes: Record<string, number[][]>;
  colors: Record<string, string>;
  idColors: string[];
}

export function buildPieceMeta(mode: GameMode): PieceMeta {
  const tetrominos = GAME_SETUP[mode].tetrominos;
  const keys = Object.keys(tetrominos);

  const shapes: Record<string, number[][]> = {};
  const colors: Record<string, string> = {};

  keys.forEach((k, idx) => {
    const mats = tetrominos[k];
    shapes[k] = mats?.length ? mats[0] : [[1]];
    colors[k] = BASE_CLASSIC_COLORS[k] ?? PALETTE[idx % PALETTE.length];
  });

  const idColors: string[] = ['#000000', ...keys.slice(0, 15).map((k) => colors[k] ?? PALETTE[0])];

  return { shapes, colors, idColors };
}
