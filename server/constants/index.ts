import { CLASSIC_TETROMINOS, CYBER_TETROMINOS, PENTOMINOES } from './tetrominos';

const STANDARD_FIRST_SPEED = 20;
const BSP_SCORES: Record<number, number> = { 0: 0, 1: 40, 2: 100, 3: 300, 4: 1200, 5: 5000 };
const TICK_INTERVAL_MS = 50;

const GAME_MODES = ['classic', 'narrow', 'pentominoes', 'cyber'] as const;
type GameMode = (typeof GAME_MODES)[number];

interface GAME_SETUP_ENTRY {
  tetrominos: Record<string, number[][][]>;
  width: number;
  height: number;
}

const GAME_SETUP: Record<GameMode, GAME_SETUP_ENTRY> = {
  classic: { tetrominos: CLASSIC_TETROMINOS, width: 10, height: 20 },
  narrow: { tetrominos: CLASSIC_TETROMINOS, width: 6, height: 22 },
  pentominoes: { tetrominos: PENTOMINOES, width: 10, height: 20 },
  cyber: { tetrominos: CYBER_TETROMINOS, width: 6, height: 16 },
};

export { BSP_SCORES, GAME_MODES, GAME_SETUP, STANDARD_FIRST_SPEED, TICK_INTERVAL_MS };
export type { GameMode };
