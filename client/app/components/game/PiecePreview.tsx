import type { JSX } from 'react';

interface PiecePreviewProps {
  type: string | null;
  shapes: Record<string, number[][]>;
  colors: Record<string, string>;
  cellSize: number;
}

/**
 * Renders a 4×4 preview grid for a Tetris piece (used for Hold and Next panels).
 * The piece is centered within the grid.
 */
export function PiecePreview({ type, shapes, colors, cellSize }: PiecePreviewProps) {
  const mat = type && shapes[type] ? shapes[type] : null;
  const gridSize = 4;
  const color = (type && colors[type]) ?? '#60a5fa';

  const matRows = mat ? mat.length : 0;
  const matCols = mat ? mat[0].length : 0;
  const rowOffset = Math.floor((gridSize - matRows) / 2);
  const colOffset = Math.floor((gridSize - matCols) / 2);

  const cells: JSX.Element[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const mr = r - rowOffset;
      const mc = c - colOffset;
      const inMat = Boolean(mat && mr >= 0 && mr < matRows && mc >= 0 && mc < matCols && mat[mr][mc]);
      cells.push(
        inMat ? (
          <div
            key={`n-${r}-${c}`}
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
        ) : (
          <div
            key={`n-${r}-${c}`}
            style={{ width: cellSize, height: cellSize, boxSizing: 'border-box' }}
          />
        )
      );
    }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`, gap: 0 }}>{cells}</div>
  );
}
