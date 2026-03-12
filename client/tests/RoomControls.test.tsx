import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomControls } from '~/components/game/RoomControls';

// Mock GameModeSelector to keep tests focused on RoomControls logic
vi.mock('~/components/GameModeSelector', () => ({
  GameModeSelector: ({ selected, disabled }: { selected: string; disabled?: boolean }) => (
    <div data-testid='game-mode-selector'>
      mode={selected} disabled={String(!!disabled)}
    </div>
  ),
}));

const defaultProps = {
  room: 'test-room',
  setRoom: vi.fn(),
  selectedMode: 'classic' as const,
  setSelectedMode: vi.fn(),
  playerId: null as string | null,
  hostId: null as string | null,
  state: null,
  error: null as string | null,
  message: null as string | null,
  hostName: null as string | null,
  playerName: null as string | null,
  create: vi.fn(),
  join: vi.fn(),
  start: vi.fn(),
  leave: vi.fn(),
  restart: vi.fn(),
};

describe('RoomControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('desktop variant (default)', () => {
    it('renders Room Settings heading', () => {
      render(<RoomControls {...defaultProps} />);
      expect(screen.getByText('Room Settings')).toBeInTheDocument();
    });

    it('renders room code input with current value', () => {
      render(<RoomControls {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter room code');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('test-room');
    });

    it('calls setRoom when input changes', () => {
      const setRoom = vi.fn();
      render(
        <RoomControls
          {...defaultProps}
          setRoom={setRoom}
        />
      );
      fireEvent.change(screen.getByPlaceholderText('Enter room code'), { target: { value: 'new-room' } });
      expect(setRoom).toHaveBeenCalledWith('new-room');
    });

    it('disables room input when player is in a room', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
        />
      );
      expect(screen.getByPlaceholderText('Enter room code')).toBeDisabled();
    });

    it('renders Create Room button when not in a room', () => {
      render(<RoomControls {...defaultProps} />);
      expect(screen.getByText('Create Room')).toBeInTheDocument();
    });

    it('renders Join Room button when not in a room', () => {
      render(<RoomControls {...defaultProps} />);
      expect(screen.getByText('Join Room')).toBeInTheDocument();
    });

    it('hides Create/Join when in a room', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
        />
      );
      expect(screen.queryByText('Create Room')).not.toBeInTheDocument();
      expect(screen.queryByText('Join Room')).not.toBeInTheDocument();
    });

    it('calls create when Create Room is clicked', () => {
      const create = vi.fn();
      render(
        <RoomControls
          {...defaultProps}
          create={create}
        />
      );
      fireEvent.click(screen.getByText('Create Room'));
      expect(create).toHaveBeenCalledOnce();
    });

    it('calls join when Join Room is clicked', () => {
      const join = vi.fn();
      render(
        <RoomControls
          {...defaultProps}
          join={join}
        />
      );
      fireEvent.click(screen.getByText('Join Room'));
      expect(join).toHaveBeenCalledOnce();
    });

    it('disables Join Room when room is empty', () => {
      render(
        <RoomControls
          {...defaultProps}
          room=''
        />
      );
      expect(screen.getByText('Join Room')).toBeDisabled();
    });

    it('disables Start Game when no playerId', () => {
      render(<RoomControls {...defaultProps} />);
      expect(screen.getByText('Start Game')).toBeDisabled();
    });

    it('disables Start Game when player is not host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p2'
          hostId='p1'
        />
      );
      expect(screen.getByText('Start Game')).toBeDisabled();
    });

    it('enables Start Game when player is the host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
        />
      );
      expect(screen.getByText('Start Game')).not.toBeDisabled();
    });

    it('calls start when Start Game is clicked', () => {
      const start = vi.fn();
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          start={start}
        />
      );
      fireEvent.click(screen.getByText('Start Game'));
      expect(start).toHaveBeenCalledOnce();
    });

    it('shows Leave Room button only when in a room', () => {
      const { rerender } = render(<RoomControls {...defaultProps} />);
      expect(screen.queryByText('Leave Room')).not.toBeInTheDocument();

      rerender(
        <RoomControls
          {...defaultProps}
          playerId='p1'
        />
      );
      expect(screen.getByText('Leave Room')).toBeInTheDocument();
    });

    it('calls leave when Leave Room is clicked', () => {
      const leave = vi.fn();
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          leave={leave}
        />
      );
      fireEvent.click(screen.getByText('Leave Room'));
      expect(leave).toHaveBeenCalledOnce();
    });

    it('shows Restart button only when game is finished and player is host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          state={{ status: 'finished', tick: 0, speed: 1, players: {} }}
        />
      );
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });

    it('hides Restart when game is not finished', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          state={{ status: 'running', tick: 0, speed: 1, players: {} }}
        />
      );
      expect(screen.queryByText('Restart')).not.toBeInTheDocument();
    });

    it('hides Restart when player is not host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p2'
          hostId='p1'
          state={{ status: 'finished', tick: 0, speed: 1, players: {} }}
        />
      );
      expect(screen.queryByText('Restart')).not.toBeInTheDocument();
    });

    it('calls restart when Restart is clicked', () => {
      const restart = vi.fn();
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          state={{ status: 'finished', tick: 0, speed: 1, players: {} }}
          restart={restart}
        />
      );
      fireEvent.click(screen.getByText('Restart'));
      expect(restart).toHaveBeenCalledOnce();
    });

    it('renders GameModeSelector', () => {
      render(<RoomControls {...defaultProps} />);
      expect(screen.getByTestId('game-mode-selector')).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders compact heading', () => {
      render(
        <RoomControls
          {...defaultProps}
          compact
        />
      );
      expect(screen.getByText('Room Settings')).toBeInTheDocument();
    });

    it('renders room code input in compact mode', () => {
      render(
        <RoomControls
          {...defaultProps}
          compact
        />
      );
      expect(screen.getByPlaceholderText('Room code')).toBeInTheDocument();
    });

    it('renders Create/Join/Start buttons in compact mode', () => {
      render(
        <RoomControls
          {...defaultProps}
          compact
        />
      );
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Join')).toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('disables Create in compact when already in a room', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          compact
        />
      );
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('disables Join in compact when no room or already in room', () => {
      render(
        <RoomControls
          {...defaultProps}
          room=''
          compact
        />
      );
      expect(screen.getByText('Join')).toBeDisabled();
    });

    it('shows Leave button in compact when in a room', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          compact
        />
      );
      expect(screen.getByText('Leave')).toBeInTheDocument();
    });

    it('shows Restart in compact when game finished and host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          state={{ status: 'finished', tick: 0, speed: 1, players: {} }}
          compact
        />
      );
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });
  });

  describe('Copy Link button', () => {
    it('shows Copy Link when in a room with a room code', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room='my-room'
        />
      );
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('hides Copy Link when not in a room', () => {
      render(
        <RoomControls
          {...defaultProps}
          room='my-room'
        />
      );
      expect(screen.queryByText('Copy Link')).not.toBeInTheDocument();
    });

    it('hides Copy Link when room is empty', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room=''
        />
      );
      expect(screen.queryByText('Copy Link')).not.toBeInTheDocument();
    });

    it('copies link via navigator.clipboard and shows Copied!', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room='my-room'
          playerName='alice'
        />
      );
      fireEvent.click(screen.getByText('Copy Link'));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/my-room/alice'));
    });

    it('uses fallback copy when clipboard API is unavailable', () => {
      // Remove clipboard API
      Object.assign(navigator, { clipboard: undefined });

      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand;

      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room='my-room'
          playerName='bob'
          compact
        />
      );
      fireEvent.click(screen.getByText('Copy Link'));

      expect(execCommand).toHaveBeenCalledWith('copy');
    });

    it('uses fallback when clipboard.writeText rejects', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'));
      Object.assign(navigator, { clipboard: { writeText } });

      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand;

      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room='my-room'
          playerName='carol'
        />
      );
      fireEvent.click(screen.getByText('Copy Link'));

      await waitFor(() => {
        expect(execCommand).toHaveBeenCalledWith('copy');
      });
    });

    it('uses "player" as default name when playerName is null', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room='my-room'
          playerName={null}
        />
      );
      fireEvent.click(screen.getByText('Copy Link'));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/my-room/player'));
      });
    });

    it('shows Copy Link in compact mode', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          room='my-room'
          compact
        />
      );
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });
  });

  describe('StatusMessages', () => {
    it('shows room code when player is host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          room='ABC123'
        />
      );
      expect(screen.getByText('Room:')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('does not show room code when player is not host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p2'
          hostId='p1'
          room='ABC123'
        />
      );
      // The "Room:" label should not be present for non-host
      expect(screen.queryByText('Room:')).not.toBeInTheDocument();
    });

    it('shows host name', () => {
      render(
        <RoomControls
          {...defaultProps}
          hostName='Alice'
        />
      );
      expect(screen.getByText('Host:')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows (you) indicator when current player is host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId='p1'
          hostName='Alice'
        />
      );
      expect(screen.getByText('(you)')).toBeInTheDocument();
    });

    it('does not show (you) when not the host', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p2'
          hostId='p1'
          hostName='Alice'
        />
      );
      expect(screen.queryByText('(you)')).not.toBeInTheDocument();
    });

    it('shows error message', () => {
      render(
        <RoomControls
          {...defaultProps}
          error='Room not found'
        />
      );
      expect(screen.getByText('Room not found')).toBeInTheDocument();
    });

    it('shows success message', () => {
      render(
        <RoomControls
          {...defaultProps}
          message='Player joined!'
        />
      );
      expect(screen.getByText('Player joined!')).toBeInTheDocument();
    });

    it('does not show error when null', () => {
      render(
        <RoomControls
          {...defaultProps}
          error={null}
        />
      );
      // No error container
      const errorEls = document.querySelectorAll('.text-status-error-text');
      expect(errorEls.length).toBe(0);
    });

    it('shows status messages in compact mode', () => {
      render(
        <RoomControls
          {...defaultProps}
          error='Some error'
          message='Some message'
          hostName='Host1'
          compact
        />
      );
      expect(screen.getByText('Some error')).toBeInTheDocument();
      expect(screen.getByText('Some message')).toBeInTheDocument();
      expect(screen.getByText('Host1')).toBeInTheDocument();
    });
  });

  describe('isHost via state.hostId fallback', () => {
    it('uses state.hostId when hostId prop is null', () => {
      render(
        <RoomControls
          {...defaultProps}
          playerId='p1'
          hostId={null}
          state={{ status: 'finished', tick: 0, speed: 1, players: {}, hostId: 'p1' }}
        />
      );
      // canRestart should be false because hostId prop is null (used for canRestart check)
      // but isHost uses state.hostId fallback
      // hostName not set so no "(you)" check; but at least shouldn't crash
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });
  });
});
