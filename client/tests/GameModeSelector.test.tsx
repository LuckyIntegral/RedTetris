import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameModeSelector } from '~/components/GameModeSelector';
import { type GameMode } from '~/constants';

describe('GameModeSelector', () => {
  const defaultProps = { selected: 'classic' as GameMode, onChange: vi.fn() };

  describe('full mode (non-compact)', () => {
    it('renders all game modes', () => {
      render(<GameModeSelector {...defaultProps} />);
      expect(screen.getByText('Classic')).toBeInTheDocument();
      expect(screen.getByText('Narrow')).toBeInTheDocument();
      expect(screen.getByText('Pentominoes')).toBeInTheDocument();
      expect(screen.getByText('Cyber')).toBeInTheDocument();
    });

    it('renders descriptions for each mode', () => {
      render(<GameModeSelector {...defaultProps} />);
      expect(screen.getByText(/original Tetris experience/)).toBeInTheDocument();
      expect(screen.getByText(/tight 6-wide board/)).toBeInTheDocument();
      expect(screen.getByText(/Five-cell pieces/)).toBeInTheDocument();
      expect(screen.getByText(/Futuristic custom shapes/)).toBeInTheDocument();
    });

    it('calls onChange when a mode is clicked', () => {
      const onChange = vi.fn();
      render(
        <GameModeSelector
          {...defaultProps}
          onChange={onChange}
        />
      );
      fireEvent.click(screen.getByText('Narrow'));
      expect(onChange).toHaveBeenCalledWith('narrow');
    });

    it('renders piece count info', () => {
      render(<GameModeSelector {...defaultProps} />);
      // Classic has 7 pieces, others may too — just check at least one "pcs" label
      const pcsElements = screen.getAllByText(/pcs$/);
      expect(pcsElements.length).toBeGreaterThan(0);
    });

    it('shows board dimensions', () => {
      render(<GameModeSelector {...defaultProps} />);
      expect(screen.getByText('10 × 20')).toBeInTheDocument();
      expect(screen.getByText('6 × 22')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders in compact layout', () => {
      const { container } = render(
        <GameModeSelector
          {...defaultProps}
          compact
        />
      );
      const grid = container.firstElementChild;
      expect(grid?.className).toContain('grid-cols-2');
    });

    it('renders all modes in compact mode', () => {
      render(
        <GameModeSelector
          {...defaultProps}
          compact
        />
      );
      expect(screen.getByText('Classic')).toBeInTheDocument();
      expect(screen.getByText('Narrow')).toBeInTheDocument();
    });

    it('calls onChange when clicking in compact mode', () => {
      const onChange = vi.fn();
      render(
        <GameModeSelector
          {...defaultProps}
          onChange={onChange}
          compact
        />
      );
      fireEvent.click(screen.getByText('Cyber'));
      expect(onChange).toHaveBeenCalledWith('cyber');
    });

    it('shows board labels in compact mode', () => {
      render(
        <GameModeSelector
          {...defaultProps}
          compact
        />
      );
      expect(screen.getByText('10 × 20')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('only renders the selected mode when disabled', () => {
      render(
        <GameModeSelector
          selected='narrow'
          onChange={vi.fn()}
          disabled
        />
      );
      expect(screen.getByText('Narrow')).toBeInTheDocument();
      expect(screen.queryByText('Classic')).not.toBeInTheDocument();
      expect(screen.queryByText('Pentominoes')).not.toBeInTheDocument();
    });

    it('buttons are disabled', () => {
      render(
        <GameModeSelector
          selected='classic'
          onChange={vi.fn()}
          disabled
        />
      );
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('only shows selected mode when disabled + compact', () => {
      render(
        <GameModeSelector
          selected='cyber'
          onChange={vi.fn()}
          disabled
          compact
        />
      );
      expect(screen.getByText('Cyber')).toBeInTheDocument();
      expect(screen.queryByText('Classic')).not.toBeInTheDocument();
    });
  });

  describe('active styling', () => {
    it('highlights the selected mode', () => {
      render(<GameModeSelector {...defaultProps} />);
      // The classic button should contain the accent styling
      const classicBtn = screen.getByText('Classic').closest('button');
      expect(classicBtn?.className).toContain('ring-1');
    });

    it('does not highlight non-selected modes', () => {
      render(<GameModeSelector {...defaultProps} />);
      const narrowBtn = screen.getByText('Narrow').closest('button');
      expect(narrowBtn?.className).toContain('bg-gray-800');
      expect(narrowBtn?.className).not.toContain('ring-1');
    });
  });
});
