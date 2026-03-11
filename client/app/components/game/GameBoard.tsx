import { useMemo, type JSX } from 'react';

interface GameBoardProps {
  board: number[][] | undefined;
  idColors: string[];
  width: number;
  height: number;
  cellSize: number;
  maxWidth: number;
  maxHeight: number;
  score: number;
}

/**
 * Renders the main Tetris game board with all cells, inside a fixed-size container.
 */
export function GameBoard({ board, idColors, width, height, cellSize, maxWidth, maxHeight, score }: GameBoardProps) {
  const cells = useMemo(() => {
    const result: JSX.Element[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result.push(renderCell(x, y, board, idColors, cellSize));
      }
    }
    return result;
  }, [board, idColors, width, height, cellSize]);

  return (
    <div className='flex flex-col items-center'>
      <div
        className='bg-surface rounded-lg p-3 border border-outline flex items-center justify-center'
        style={{ width: maxWidth * cellSize + 24, height: maxHeight * cellSize + 24 }}
      >
        <div
          style={{
            width: width * cellSize,
            display: 'grid',
            gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
            gap: 0,
          }}
        >
          {cells}
        </div>
      </div>

      <div className='mt-4 bg-surface-alt rounded-lg p-3 border border-outline'>
        <div className='text-center text-on-surface'>
          <span className='text-lg font-bold text-on-surface'>{score}</span>
          <div className='text-sm text-on-surface-muted'>Score</div>
        </div>
      </div>
    </div>
  );
}

function renderCell(
  x: number,
  y: number,
  board: number[][] | undefined,
  idColors: string[],
  cellSize: number
): JSX.Element {
  const val = board?.[y]?.[x] ?? 0;

  if (val === 0) {
    return (
      <div
        key={`${x}-${y}`}
        style={{
          width: cellSize,
          height: cellSize,
          boxSizing: 'border-box',
          outline: '1px solid var(--cell-grid)',
        }}
      />
    );
  }

  if (val === -2) {
    return (
      <div
        key={`${x}-${y}`}
        style={{
          width: cellSize,
          height: cellSize,
          boxSizing: 'border-box',
          borderRadius: 2,
          background: 'var(--cell-ghost-bg)',
          borderTop: '1px solid var(--cell-ghost-border-light)',
          borderLeft: '1px solid var(--cell-ghost-border-light)',
          borderBottom: '1px solid var(--cell-ghost-border-dark)',
          borderRight: '1px solid var(--cell-ghost-border-dark)',
        }}
      />
    );
  }

  if (val === -1) {
    return (
      <div
        key={`${x}-${y}`}
        style={{
          width: cellSize,
          height: cellSize,
          boxSizing: 'border-box',
          borderRadius: 2,
          background: 'var(--cell-penalty-bg)',
          borderTop: '1px solid var(--cell-penalty-border-light)',
          borderLeft: '1px solid var(--cell-penalty-border-light)',
          borderBottom: '1px solid var(--cell-penalty-border-dark)',
          borderRight: '1px solid var(--cell-penalty-border-dark)',
        }}
      />
    );
  }

  const color = idColors[val] ?? '#999';
  return (
    <div
      key={`${x}-${y}`}
      style={{
        width: cellSize,
        height: cellSize,
        boxSizing: 'border-box',
        borderRadius: 2,
        background: color,
        borderTop: '1px solid var(--piece-border-light)',
        borderLeft: '1px solid var(--piece-border-light)',
        borderBottom: '1px solid var(--piece-border-dark)',
        borderRight: '1px solid var(--piece-border-dark)',
      }}
    />
  );
}
