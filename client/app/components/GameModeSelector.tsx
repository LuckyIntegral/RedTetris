import { GAME_MODES, GAME_MODE_INFO, GAME_SETUP, type GameMode } from '../constants';

interface GameModeSelectorProps {
  selected: GameMode;
  onChange: (mode: GameMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function GameModeSelector({ selected, onChange, disabled, compact }: GameModeSelectorProps) {
  const modes = disabled ? [selected] : Array.from(GAME_MODES);

  if (compact) {
    return (
      <div className='grid grid-cols-2 gap-2'>
        {modes.map((m) => {
          const info = GAME_MODE_INFO[m];
          const isActive = selected === m;
          return (
            <button
              key={m}
              type='button'
              disabled={disabled}
              onClick={() => onChange(m)}
              className={`relative rounded-lg p-2.5 text-left transition-all border ${
                isActive
                  ? `${info.accentBg} ${info.accentBorder} ring-1 ring-offset-0 ring-current ${info.accentColor}`
                  : 'bg-surface-alt border-outline hover:border-on-surface-faint'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-base'>{info.icon}</span>
                <span className={`text-sm font-semibold ${isActive ? info.accentColor : 'text-on-surface'}`}>
                  {info.label}
                </span>
              </div>
              <div className='text-[10px] text-on-surface-muted'>{info.boardLabel}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-2'>
      {modes.map((m) => {
        const info = GAME_MODE_INFO[m];
        const setup = GAME_SETUP[m];
        const isActive = selected === m;
        const pieceCount = Object.keys(setup.tetrominos).length;

        return (
          <button
            key={m}
            type='button'
            disabled={disabled}
            onClick={() => onChange(m)}
            className={`relative rounded-lg p-3 text-left transition-all border ${
              isActive
                ? `${info.accentBg} ${info.accentBorder} ring-1 ring-offset-0 ring-current ${info.accentColor}`
                : 'bg-surface-alt border-outline hover:border-on-surface-faint hover:bg-surface-alt/80'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className='flex items-start gap-3'>
              <span className='text-2xl mt-0.5'>{info.icon}</span>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between mb-1'>
                  <span className={`text-sm font-bold ${isActive ? info.accentColor : 'text-on-surface'}`}>
                    {info.label}
                  </span>
                  <div className='flex items-center gap-2 text-[10px] text-on-surface-faint'>
                    <span className='bg-surface-hover/60 px-1.5 py-0.5 rounded'>{info.boardLabel}</span>
                    <span className='bg-surface-hover/60 px-1.5 py-0.5 rounded'>{pieceCount} pcs</span>
                  </div>
                </div>
                <p className='text-xs text-on-surface-muted leading-relaxed'>{info.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
