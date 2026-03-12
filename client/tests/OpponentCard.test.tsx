import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpponentCard } from '~/components/game/OpponentCard';

const idColors = ['#000', '#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#fff'];

const defaultProps = {
  id: 'p1',
  name: 'TestPlayer',
  board: null,
  isAlive: true,
  score: 100,
  isHost: false,
  idColors,
  width: 4,
  height: 4,
};

describe('OpponentCard', () => {
  describe('player info', () => {
    it('renders player name', () => {
      render(<OpponentCard {...defaultProps} />);
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    it('renders score', () => {
      render(
        <OpponentCard
          {...defaultProps}
          score={42}
        />
      );
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows Host label when isHost is true', () => {
      render(
        <OpponentCard
          {...defaultProps}
          isHost={true}
        />
      );
      expect(screen.getByText('Host')).toBeInTheDocument();
    });

    it('does not show Host label when isHost is false', () => {
      render(
        <OpponentCard
          {...defaultProps}
          isHost={false}
        />
      );
      expect(screen.queryByText('Host')).not.toBeInTheDocument();
    });
  });

  describe('alive/dead status', () => {
    it('shows ALIVE status and green indicator when alive', () => {
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          isAlive={true}
        />
      );
      expect(screen.getByText('ALIVE')).toBeInTheDocument();
      const dot = container.querySelector('.bg-green-400');
      expect(dot).toBeInTheDocument();
    });

    it('shows DEAD status and red indicator when dead', () => {
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          isAlive={false}
        />
      );
      expect(screen.getByText('DEAD')).toBeInTheDocument();
      const dot = container.querySelector('.bg-red-400');
      expect(dot).toBeInTheDocument();
    });

    it('applies green badge styling when alive', () => {
      render(
        <OpponentCard
          {...defaultProps}
          isAlive={true}
        />
      );
      const badge = screen.getByText('ALIVE');
      expect(badge.className).toContain('bg-green-500/20');
      expect(badge.className).toContain('text-green-300');
    });

    it('applies red badge styling when dead', () => {
      render(
        <OpponentCard
          {...defaultProps}
          isAlive={false}
        />
      );
      const badge = screen.getByText('DEAD');
      expect(badge.className).toContain('bg-red-500/20');
      expect(badge.className).toContain('text-red-300');
    });
  });

  describe('board rendering', () => {
    it('renders board cells with null board (all transparent)', () => {
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={null}
        />
      );
      const cells = container.querySelectorAll<HTMLElement>('[style*="box-sizing"]');
      expect(cells.length).toBe(16); // 4x4
      cells.forEach((cell) => {
        expect(cell.style.background).toBe('transparent');
      });
    });

    it('renders empty cells (val=0) as transparent', () => {
      const board = [
        [0, 0],
        [0, 0],
      ];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={2}
          height={2}
        />
      );
      const cells = container.querySelectorAll<HTMLElement>('[style*="box-sizing"]');
      cells.forEach((cell) => {
        expect(cell.style.background).toBe('transparent');
      });
    });

    it('renders penalty cells (val=-2) with alive color', () => {
      const board = [[-2]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={true}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('var(--opponent-ghost-alive)');
    });

    it('renders penalty cells (val=-2) with dead color', () => {
      const board = [[-2]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={false}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('var(--opponent-ghost-dead)');
    });

    it('renders locked cells (val=-1) with alive color', () => {
      const board = [[-1]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={true}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('var(--opponent-penalty-alive)');
    });

    it('renders locked cells (val=-1) with dead color', () => {
      const board = [[-1]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={false}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('var(--opponent-penalty-dead)');
    });

    it('renders piece cells (val>0) with idColors when alive', () => {
      const board = [[1]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={true}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('rgb(255, 0, 0)'); // idColors[1]
    });

    it('renders piece cells (val>0) as dead-piece color when dead', () => {
      const board = [[1]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={false}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('var(--opponent-dead-piece)');
    });

    it('falls back to #999 when idColors does not have the piece index', () => {
      const board = [[99]]; // index 99 doesn't exist in idColors
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={true}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.background).toBe('rgb(153, 153, 153)');
    });

    it('applies borderRadius 1 for alive pieces and 0 otherwise', () => {
      const board = [[1, 0]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={2}
          height={1}
          isAlive={true}
        />
      );
      const cells = container.querySelectorAll<HTMLElement>('[style*="box-sizing"]');
      expect(cells[0].style.borderRadius).toBe('1px');
      expect(cells[1].style.borderRadius).toBe('0px');
    });

    it('applies borderRadius 0 for dead pieces', () => {
      const board = [[1]];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={1}
          height={1}
          isAlive={false}
        />
      );
      const cell = container.querySelector<HTMLElement>('[style*="box-sizing"]');
      expect(cell?.style.borderRadius).toBe('0px');
    });

    it('renders correct grid dimensions', () => {
      const board = [
        [0, 0, 0],
        [0, 0, 0],
      ];
      const { container } = render(
        <OpponentCard
          {...defaultProps}
          board={board}
          width={3}
          height={2}
        />
      );
      const cells = container.querySelectorAll<HTMLElement>('[style*="box-sizing"]');
      expect(cells.length).toBe(6); // 3x2
    });
  });
});
