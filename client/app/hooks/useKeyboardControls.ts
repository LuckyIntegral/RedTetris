import { useEffect } from 'react';
import type { Socket } from '../types/socket';

const DAS_DELAY = 170; // ms before auto-repeat kicks in
const REPEAT_INTERVAL = 50; // ms between repeated moves

/**
 * Keyboard controls for the Tetris game.
 * Replicates the exact intent payloads the server expects.
 */
export function useKeyboardControls(socketRef: React.RefObject<Socket | null>, room: string, playerId: string | null) {
  useEffect(() => {
    const held = new Map<string, ReturnType<typeof setTimeout>>();

    const fireIntent = (key: string) => {
      const s = socketRef.current;
      if (!s) return;
      if (key === 'ArrowLeft') s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'left' } });
      else if (key === 'ArrowRight') s.emit('intent', { roomId: room, intent: { type: 'move', dir: 'right' } });
      else if (key === 'ArrowDown') s.emit('intent', { roomId: room, intent: { type: 'soft' } });
    };

    const clearKey = (key: string) => {
      const timer = held.get(key);
      if (timer != null) {
        clearTimeout(timer);
        held.delete(key);
      }
    };

    const repeatableKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown']);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!playerId || !socketRef.current) return;
      const s = socketRef.current;

      if (repeatableKeys.has(e.key)) {
        e.preventDefault();
        if (held.has(e.key)) return; // already held
        fireIntent(e.key); // fire once immediately
        // after DAS_DELAY, start rapid repeat
        const dasTimer = setTimeout(() => {
          const interval = setInterval(() => fireIntent(e.key), REPEAT_INTERVAL);
          held.set(e.key, interval);
        }, DAS_DELAY);
        held.set(e.key, dasTimer);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'rotate' } });
      }
      if (e.key === 'Shift') s.emit('intent', { roomId: room, intent: { type: 'hold' } });
      if (e.code === 'Space') {
        e.preventDefault();
        s.emit('intent', { roomId: room, intent: { type: 'hard' } });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      clearKey(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      held.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      held.clear();
    };
  }, [playerId, room, socketRef]);
}
