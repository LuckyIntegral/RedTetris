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
        className='bg-gray-900 rounded-lg p-3 border border-gray-600 flex items-center justify-center'
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

      <div className='mt-4 bg-gray-800 rounded-lg p-3 border border-gray-600'>
        <div className='text-center text-white'>
          <span className='text-lg font-bold text-white'>{score}</span>
          <div className='text-sm text-gray-400'>Score</div>
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
  cellSize: number,
): JSX.Element {
  const val = board?.[y]?.[x] ?? 0;

  if (val === 0) {
    return (
      <div
        key={`${x}-${y}`}
        style={{ width: cellSize, height: cellSize, boxSizing: 'border-box', outline: '1px solid rgba(255,255,255,0.12)' }}
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
          background: 'rgba(255,255,255,0.12)',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(0,0,0,0.2)',
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
          background: '#374151',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(0,0,0,0.2)',
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
        borderTop: '1px solid rgba(255,255,255,0.15)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(0,0,0,0.3)',
        borderRight: '1px solid rgba(0,0,0,0.2)',
      }}
    />
  );
}
