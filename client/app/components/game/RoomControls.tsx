import { GameModeSelector } from '../GameModeSelector';
import type { GameMode } from '../../constants';
import type { GameState } from '../../types/socket';

interface RoomControlsProps {
  room: string;
  setRoom: (v: string) => void;
  selectedMode: GameMode;
  setSelectedMode: (m: GameMode) => void;
  playerId: string | null;
  hostId: string | null;
  state: GameState | null;
  error: string | null;
  message: string | null;
  hostName: string | null;
  create: () => void;
  join: () => void;
  start: () => void;
  leave: () => void;
  restart: () => void;
  compact?: boolean;
}

/**
 * Room settings panel — shown both in the mobile header area and the desktop sidebar.
 */
export function RoomControls({
  room,
  setRoom,
  selectedMode,
  setSelectedMode,
  playerId,
  hostId,
  state,
  error,
  message,
  hostName,
  create,
  join,
  start,
  leave,
  restart,
  compact = false,
}: RoomControlsProps) {
  const isHost = hostId === playerId || state?.hostId === playerId;
  const canRestart = state?.status === 'finished' && playerId && hostId && playerId === hostId;

  if (compact) {
    return (
      <div className='bg-surface rounded-xl p-4 border border-outline shadow-sm mb-6 max-w-xl mx-auto xl:hidden'>
        <h2 className='text-lg font-semibold text-on-surface mb-3 text-center'>Room Settings</h2>

        <div className='space-y-3'>
          <div>
            <label className='block text-xs font-medium text-on-surface-muted mb-1'>Room Code</label>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={!!playerId}
              className='w-full px-3 py-2 text-sm bg-surface-alt border border-outline rounded-lg text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
              placeholder='Room code'
            />
          </div>

          <div>
            <label className='block text-xs font-medium text-on-surface-muted mb-1'>Game Mode</label>
            <GameModeSelector
              selected={selectedMode}
              onChange={setSelectedMode}
              disabled={!!playerId}
              compact
            />
          </div>

          <div className='flex flex-wrap justify-center gap-2'>
            <button
              onClick={create}
              disabled={!!playerId}
              className='px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
            >
              Create
            </button>
            <button
              onClick={join}
              disabled={!!playerId || !room}
              className='px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
            >
              Join
            </button>
            <button
              onClick={start}
              disabled={!playerId || (hostId ? playerId !== hostId : false)}
              className='px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
            >
              Start
            </button>
            {canRestart && (
              <button
                onClick={restart}
                className='px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors'
              >
                Restart
              </button>
            )}
            {playerId && (
              <button
                onClick={leave}
                className='px-4 py-2 text-sm bg-surface-hover hover:bg-surface-alt text-on-surface-variant hover:text-on-surface font-semibold rounded-lg transition-colors'
              >
                Leave
              </button>
            )}
          </div>

          {/* Status Messages */}
          <StatusMessages
            room={room}
            hostId={hostId}
            playerId={playerId}
            hostName={hostName}
            isHost={isHost}
            error={error}
            message={message}
          />
        </div>
      </div>
    );
  }

  /* Desktop variant */
  return (
    <div className='hidden xl:block w-80 shrink-0 space-y-4'>
      <div className='bg-surface rounded-xl p-4 border border-outline shadow-sm'>
        <h2 className='text-lg font-semibold text-on-surface mb-4 text-center'>Room Settings</h2>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-on-surface-muted mb-2'>Room Code</label>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={!!playerId}
              className='w-full px-3 py-2 bg-surface-alt border border-outline rounded-lg text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
              placeholder='Enter room code'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-on-surface-muted mb-2'>Game Mode</label>
            <GameModeSelector
              selected={selectedMode}
              onChange={setSelectedMode}
              disabled={!!playerId}
            />
          </div>

          <div className='space-y-2'>
            {!playerId && (
              <button
                onClick={create}
                className='w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors'
              >
                Create Room
              </button>
            )}
            {!playerId && (
              <button
                onClick={join}
                disabled={!room}
                className='w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
              >
                Join Room
              </button>
            )}
            <button
              onClick={start}
              disabled={!playerId || (hostId ? playerId !== hostId : false)}
              className='w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors'
            >
              Start Game
            </button>
            {canRestart && (
              <button
                onClick={restart}
                className='w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors'
              >
                Restart
              </button>
            )}
            {playerId && (
              <button
                onClick={leave}
                className='w-full px-4 py-2 bg-surface-hover hover:bg-surface-alt text-on-surface-variant hover:text-on-surface font-semibold rounded-lg transition-colors'
              >
                Leave Room
              </button>
            )}
          </div>

          {/* Status Messages */}
          <StatusMessages
            room={room}
            hostId={hostId}
            playerId={playerId}
            hostName={hostName}
            isHost={isHost}
            error={error}
            message={message}
          />
        </div>
      </div>
    </div>
  );
}

function StatusMessages({
  room,
  hostId,
  playerId,
  hostName,
  isHost,
  error,
  message,
}: {
  room: string;
  hostId: string | null;
  playerId: string | null;
  hostName: string | null;
  isHost: boolean;
  error: string | null;
  message: string | null;
}) {
  return (
    <div className='space-y-2'>
      {hostId && playerId === hostId && (
        <div className='bg-status-success-bg border border-status-success-border rounded-lg p-2 text-center'>
          <span className='text-status-success-text text-sm font-medium'>Room: </span>
          <span className='text-on-surface text-sm font-bold'>{room}</span>
        </div>
      )}
      {hostName && (
        <div className='bg-surface-alt border border-outline rounded-lg p-2 text-center'>
          <span className='text-on-surface-muted text-sm font-medium'>Host: </span>
          <span className='text-on-surface text-sm font-semibold'>{hostName}</span>
          {isHost ? <span className='text-on-surface-muted text-sm font-medium'> (you)</span> : null}
        </div>
      )}
      {error && (
        <div className='bg-status-error-bg border border-status-error-border rounded-lg p-2 text-center'>
          <span className='text-status-error-text text-sm'>{error}</span>
        </div>
      )}
      {message && (
        <div className='bg-status-success-bg border border-status-success-border rounded-lg p-2 text-center'>
          <span className='text-status-success-text text-sm'>{message}</span>
        </div>
      )}
    </div>
  );
}
