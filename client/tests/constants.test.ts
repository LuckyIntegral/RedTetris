import { describe, it, expect } from 'vitest';
import {
  GAME_MODES,
  GAME_MODE_INFO,
  GAME_SETUP,
  BSP_SCORES,
  STANDARD_FIRST_SPEED,
  TICK_INTERVAL_MS,
} from '~/constants';
import type { GameMode } from '~/constants';

describe('constants/index', () => {
  describe('GAME_MODES', () => {
    it('contains exactly four modes', () => {
      expect(GAME_MODES).toHaveLength(4);
    });

    it('includes classic, narrow, pentominoes, cyber', () => {
      expect(GAME_MODES).toContain('classic');
      expect(GAME_MODES).toContain('narrow');
      expect(GAME_MODES).toContain('pentominoes');
      expect(GAME_MODES).toContain('cyber');
    });
  });

  describe('GAME_SETUP', () => {
    it('has an entry for every game mode', () => {
      for (const mode of GAME_MODES) {
        expect(GAME_SETUP[mode]).toBeDefined();
      }
    });

    it.each([
      ['classic', 10, 20],
      ['narrow', 6, 22],
      ['pentominoes', 12, 22],
      ['cyber', 8, 18],
    ] as [GameMode, number, number][])(
      '%s has width=%d and height=%d',
      (mode, width, height) => {
        expect(GAME_SETUP[mode].width).toBe(width);
        expect(GAME_SETUP[mode].height).toBe(height);
      },
    );

    it('each setup has tetrominos as a non-empty object', () => {
      for (const mode of GAME_MODES) {
        const keys = Object.keys(GAME_SETUP[mode].tetrominos);
        expect(keys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GAME_MODE_INFO', () => {
    it('has an entry for every game mode', () => {
      for (const mode of GAME_MODES) {
        expect(GAME_MODE_INFO[mode]).toBeDefined();
      }
    });

    it('each entry has required fields', () => {
      for (const mode of GAME_MODES) {
        const info = GAME_MODE_INFO[mode];
        expect(info.label).toBeTruthy();
        expect(info.description).toBeTruthy();
        expect(info.icon).toBeDefined();
        expect(info.accentColor).toBeTruthy();
        expect(info.accentBg).toBeTruthy();
        expect(info.accentBorder).toBeTruthy();
        expect(info.boardLabel).toBeTruthy();
        expect(info.piecesLabel).toBeTruthy();
      }
    });

    it('classic mode has correct label', () => {
      expect(GAME_MODE_INFO.classic.label).toBe('Classic');
    });

    it('narrow mode has correct label', () => {
      expect(GAME_MODE_INFO.narrow.label).toBe('Narrow');
    });

    it('pentominoes mode has correct label', () => {
      expect(GAME_MODE_INFO.pentominoes.label).toBe('Pentominoes');
    });

    it('cyber mode has correct label', () => {
      expect(GAME_MODE_INFO.cyber.label).toBe('Cyber');
    });
  });

  describe('BSP_SCORES', () => {
    it('maps line clears 0-5 to expected scores', () => {
      expect(BSP_SCORES[0]).toBe(0);
      expect(BSP_SCORES[1]).toBe(40);
      expect(BSP_SCORES[2]).toBe(100);
      expect(BSP_SCORES[3]).toBe(300);
      expect(BSP_SCORES[4]).toBe(1200);
      expect(BSP_SCORES[5]).toBe(5000);
    });
  });

  describe('numeric constants', () => {
    it('STANDARD_FIRST_SPEED is 20', () => {
      expect(STANDARD_FIRST_SPEED).toBe(20);
    });

    it('TICK_INTERVAL_MS is 50', () => {
      expect(TICK_INTERVAL_MS).toBe(50);
    });
  });
});
