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
    <main className='min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-5xl font-bold text-white mb-4 drop-shadow-lg'>
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400'>
              RED TETRIS
            </span>
          </h1>
          <p className='text-xl text-gray-300'>Welcome Back!</p>
          <p className='text-gray-400 mt-2'>Sign in to continue your game</p>
        </div>

        {/* Login Form */}
        <div className='bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl'>
          <form
            className='space-y-6'
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            {error && (
              <div className='bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg p-4'>
                <div className='text-red-200 text-sm text-center'>{error}</div>
              </div>
            )}

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='username'
                  className='block text-sm font-medium text-gray-300 mb-2'
                >
                  Username
                </label>
                <input
                  id='username'
                  name='username'
                  type='text'
                  required
                  className='w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-200 backdrop-blur-sm'
                  placeholder='Enter your username'
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-300 mb-2'
                >
                  Password
                </label>
                <input
                  id='password'
                  name='password'
                  type='password'
                  required
                  className='w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-200 backdrop-blur-sm'
                  placeholder='Enter your password'
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 disabled:transform-none disabled:opacity-70'
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
                '🎮 Sign In'
              )}
            </button>

            <div className='text-center pt-4 border-t border-white/10'>
              <p className='text-gray-400 text-sm'>
                Don't have an account?{' '}
                <Link
                  to='/register'
                  className='text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition-colors duration-200'
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
