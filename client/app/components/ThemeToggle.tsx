interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggle: () => void;
}

export function ThemeToggle({ theme, toggle }: ThemeToggleProps) {
  return (
    <button
      onClick={toggle}
      className='fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-surface border border-outline hover:bg-surface-alt transition-colors shadow-sm'
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <span
          className='w-5 h-5 text-yellow-400 flex items-center justify-center text-lg leading-none'
          aria-hidden='true'
        >
          ☀
        </span>
      ) : (
        <span
          className='w-5 h-5 text-slate-600 flex items-center justify-center text-2xl leading-none -mt-px'
          aria-hidden='true'
        >
          ☾
        </span>
      )}
    </button>
  );
}
