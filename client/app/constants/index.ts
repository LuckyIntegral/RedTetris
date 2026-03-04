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
  pentominoes: { tetrominos: PENTOMINOES, width: 12, height: 22 },
  cyber: { tetrominos: CYBER_TETROMINOS, width: 8, height: 18 },
};

interface GameModeInfo {
  label: string;
  description: string;
  icon: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  boardLabel: string;
  piecesLabel: string;
}

const GAME_MODE_INFO: Record<GameMode, GameModeInfo> = {
  classic: {
    label: 'Classic',
    description: 'The original Tetris experience with standard pieces and a 10×20 board.',
    icon: '',
    accentColor: 'text-blue-400',
    accentBg: 'bg-blue-500/15',
    accentBorder: 'border-blue-500/40',
    boardLabel: '10 × 20',
    piecesLabel: '7 classic tetrominoes',
  },
  narrow: {
    label: 'Narrow',
    description: 'Classic pieces on a tight 6-wide board. Every move counts!',
    icon: '',
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/15',
    accentBorder: 'border-amber-500/40',
    boardLabel: '6 × 22',
    piecesLabel: '7 classic tetrominoes',
  },
  pentominoes: {
    label: 'Pentominoes',
    description: 'Five-cell pieces on a wider board. A whole new level of complexity.',
    icon: '',
    accentColor: 'text-purple-400',
    accentBg: 'bg-purple-500/15',
    accentBorder: 'border-purple-500/40',
    boardLabel: '12 × 22',
    piecesLabel: '18 pentomino shapes',
  },
  cyber: {
    label: 'Cyber',
    description: 'Futuristic custom shapes on a compact board. Expect the unexpected.',
    icon: '',
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/15',
    accentBorder: 'border-cyan-500/40',
    boardLabel: '8 × 18',
    piecesLabel: '6 cyber shapes',
  },
};

export { BSP_SCORES, GAME_MODES, GAME_MODE_INFO, GAME_SETUP, STANDARD_FIRST_SPEED, TICK_INTERVAL_MS };
export type { GameMode, GameModeInfo };
