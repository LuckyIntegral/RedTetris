import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, clearError } from '../../store/authSlice';

export function LoginForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { error, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const result = await dispatch(loginUser({ username, password }));
    if (loginUser.fulfilled.match(result)) {
      void navigate('/');
    }
  };

  return (
    <main className='min-h-screen bg-page flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-5xl font-bold text-red-500 mb-4'>RED TETRIS</h1>
          <p className='text-xl text-on-surface-variant'>Welcome Back!</p>
          <p className='text-on-surface-muted mt-2'>Sign in to continue your game</p>
        </div>

        {/* Login Form */}
        <div className='bg-surface rounded-xl p-8 border border-outline shadow-sm'>
          <form
            className='space-y-6'
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            {error && (
              <div className='bg-status-error-bg border border-status-error-border rounded-lg p-4'>
                <div className='text-status-error-text text-sm text-center'>{error}</div>
              </div>
            )}

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='username'
                  className='block text-sm font-medium text-on-surface-muted mb-2'
                >
                  Username
                </label>
                <input
                  id='username'
                  name='username'
                  type='text'
                  required
                  className='w-full bg-surface-alt border border-outline rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors'
                  placeholder='Enter your username'
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-on-surface-muted mb-2'
                >
                  Password
                </label>
                <input
                  id='password'
                  name='password'
                  type='password'
                  required
                  className='w-full bg-surface-alt border border-outline rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors'
                  placeholder='Enter your password'
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-red-600 hover:bg-red-500 disabled:bg-surface-hover disabled:opacity-70 text-white font-bold py-4 px-6 rounded-lg transition-colors'
            >
              {isLoading ? (
                <span className='flex items-center justify-center'>
                  <svg
                    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <div className='text-center pt-4 border-t border-outline-variant'>
              <p className='text-on-surface-muted text-sm'>
                Don't have an account?{' '}
                <Link
                  to='/register'
                  className='text-red-400 hover:text-red-300 font-medium hover:underline transition-colors'
                >
                  Create one here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
