import { useMemo } from 'react';
import { Link } from 'react-router';
import { LoadingOverlay } from '../LoadingOverlay';
import { GAME_MODE_INFO, GAME_SETUP } from '../../constants';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useKeyboardControls } from '../../hooks/useKeyboardControls';
import { buildPieceMeta } from '../../utils/pieceHelpers';
import { GameBoard } from './GameBoard';
import { OpponentCard } from './OpponentCard';
import { PiecePreview } from './PiecePreview';
import { RoomControls } from './RoomControls';

const CELL = 28;

// Fixed dimensions based on the widest/tallest mode so layout doesn't shift when switching modes
const MAX_WIDTH = Math.max(...Object.values(GAME_SETUP).map((s) => s.width));
const MAX_HEIGHT = Math.max(...Object.values(GAME_SETUP).map((s) => s.height));

/**
 * Main game page component — composes all game sub-components and wires up hooks.
 */
export function GamePage() {
  const game = useGameSocket();
  useKeyboardControls(game.socketRef, game.room, game.playerId);

  const setup = GAME_SETUP[game.selectedMode];
  const WIDTH = setup.width;
  const HEIGHT = setup.height;

  const pieceMeta = useMemo(() => buildPieceMeta(game.selectedMode), [game.selectedMode]);

  const modeInfo = GAME_MODE_INFO[game.selectedMode];

  const roomControlProps = {
    room: game.room,
    setRoom: game.setRoom,
    selectedMode: game.selectedMode,
    setSelectedMode: game.setSelectedMode,
    playerId: game.playerId,
    hostId: game.hostId,
    state: game.state,
    error: game.error,
    message: game.message,
    hostName: game.hostName,
    create: game.create,
    join: game.join,
    start: game.start,
    leave: game.leave,
    restart: game.restart,
  };

  return (
    <main
      className='min-h-screen bg-slate-900 p-6'
      style={{ pointerEvents: 'auto' }}
    >
      <div className='container mx-auto max-w-[1600px]'>
        <header className='flex items-center justify-center mb-8 relative'>
          <Link
            to='/'
            className='absolute left-0 z-10 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2'
          >
            Back
          </Link>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-red-500 mb-2'>RED TETRIS</h1>
            <p className='text-gray-400'>Play Mode</p>
          </div>
        </header>

        {/* Mobile Room Controls */}
        <RoomControls
          {...roomControlProps}
          compact
        />

        {/* Main Game Layout */}
        <div className='flex flex-wrap xl:flex-nowrap gap-6 justify-center items-start min-h-[600px]'>
          {/* Left Side: Room Controls (Desktop) */}
          <RoomControls {...roomControlProps} />

          {/* Center: Game Area */}
          <div className='flex flex-wrap sm:flex-nowrap items-start gap-4 sm:gap-6 justify-center'>
            {/* Hold Piece */}
            <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
              <h3 className='text-sm font-semibold text-white mb-3 text-center'>Hold</h3>
              <div
                className='bg-gray-900 rounded-lg p-3 border border-gray-600 flex justify-center items-center'
                style={{ width: 4 * CELL + 24, height: 4 * CELL + 24 }}
              >
                <PiecePreview
                  type={game.myView?.holdPiece ?? null}
                  shapes={pieceMeta.shapes}
                  colors={pieceMeta.colors}
                  cellSize={CELL}
                />
              </div>
            </div>

            {/* Main Game Board */}
            <div className='bg-gray-900 rounded-xl p-6 border border-gray-600'>
              <h3 className='text-xl font-semibold text-white mb-4 text-center'>Your Board</h3>
              <div className='flex items-center justify-center gap-2 mb-3'>
                <span className='text-base'>{modeInfo.icon}</span>
                <span className={`text-sm font-medium ${modeInfo.accentColor}`}>{modeInfo.label}</span>
                <span className='text-[10px] text-gray-500'>({modeInfo.boardLabel})</span>
              </div>

              <GameBoard
                board={game.myView?.board}
                idColors={pieceMeta.idColors}
                width={WIDTH}
                height={HEIGHT}
                cellSize={CELL}
                maxWidth={MAX_WIDTH}
                maxHeight={MAX_HEIGHT}
                score={game.myView?.score ?? 0}
              />
            </div>

            {/* Next Piece */}
            <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
              <h3 className='text-sm font-semibold text-white mb-3 text-center'>Next</h3>
              <div
                className='bg-gray-900 rounded-lg p-3 border border-gray-600 flex justify-center items-center'
                style={{ width: 4 * CELL + 24, height: 4 * CELL + 24 }}
              >
                <PiecePreview
                  type={game.myView?.nextPiece ?? null}
                  shapes={pieceMeta.shapes}
                  colors={pieceMeta.colors}
                  cellSize={CELL}
                />
              </div>
            </div>
          </div>

          {/* Right Side: Opponents */}
          {game.opponents.length > 0 && (
            <div className='w-full sm:w-72 xl:w-80 shrink-0 space-y-4'>
              <div className='bg-gray-900 rounded-xl p-4 border border-gray-600'>
                <h3 className='text-lg font-semibold text-white mb-4 text-center'>Opponents</h3>
                <div className='space-y-3'>
                  {game.opponents.map((op) => (
                    <OpponentCard
                      key={op.id}
                      id={op.id}
                      name={op.name}
                      board={op.board}
                      isAlive={op.isAlive}
                      score={op.score}
                      isHost={op.isHost}
                      idColors={pieceMeta.idColors}
                      width={WIDTH}
                      height={HEIGHT}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {game.actionLoading && <LoadingOverlay />}
    </main>
  );
}
