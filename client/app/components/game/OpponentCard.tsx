import type { JSX } from 'react';

interface OpponentCardProps {
  id: string;
  name: string;
  board: number[][] | null;
  isAlive: boolean;
  score: number;
  isHost: boolean;
  idColors: string[];
  width: number;
  height: number;
}

/**
 * Renders a single opponent card with status info and a mini board.
 */
export function OpponentCard({ name, board, isAlive, score, isHost, idColors, width, height }: OpponentCardProps) {
  const cellSize = 5;

  const renderOpponentBoard = () => {
    const cells: JSX.Element[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const val = board?.[y]?.[x] ?? 0;
        let bg = 'transparent';
        if (val === 0) bg = 'transparent';
        else if (val === -2) bg = isAlive ? 'var(--opponent-ghost-alive)' : 'var(--opponent-ghost-dead)';
        else if (val === -1) bg = isAlive ? 'var(--opponent-penalty-alive)' : 'var(--opponent-penalty-dead)';
        else bg = isAlive ? (idColors[val] ?? '#999') : 'var(--opponent-dead-piece)';

        const isPiece = val > 0;
        cells.push(
          <div
            key={`op-${x}-${y}`}
            style={{
              width: cellSize,
              height: cellSize,
              boxSizing: 'border-box',
              borderRadius: isPiece && isAlive ? 1 : 0,
              background: bg,
            }}
          />
        );
      }
    }

    return (
      <div style={{ width: width * cellSize, height: height * cellSize, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${width}, ${cellSize}px)`, gap: 0 }}>{cells}</div>
      </div>
    );
  };

  return (
    <div className='bg-surface-alt rounded-lg p-3 border border-outline flex gap-3 items-center justify-between'>
      {/* Left: Info */}
      <div className='flex-1 min-w-0 flex flex-col items-start justify-center'>
        <div className='flex items-center gap-1.5 mb-1'>
          <div
            className={`w-2 h-2 rounded-full ${isAlive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'}`}
          />
          <span className='text-sm font-semibold text-on-surface truncate'>{name}</span>
        </div>
        {isHost && <span className='text-[10px] text-yellow-500 font-medium mb-1'>Host</span>}
        <div className='text-xs text-on-surface-muted mb-2'>
          Score: <span className='text-on-surface font-semibold'>{score}</span>
        </div>
        <div
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isAlive
              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
              : 'bg-red-500/20 text-red-300 border border-red-400/30'
          }`}
        >
          {isAlive ? 'ALIVE' : 'DEAD'}
        </div>
      </div>
      {/* Right: Board */}
      <div className='shrink-0 rounded-lg p-1.5 border border-outline flex justify-center' style={{ background: 'var(--mini-board-bg)' }}>
        {renderOpponentBoard()}
      </div>
    </div>
  );
}
