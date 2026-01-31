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
    <div className='flex min-h-screen items-center justify-center bg-white dark:bg-gray-950 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100'>
            Red Tetris
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400'>Sign in to your account</p>
        </div>

        <form
          className='mt-8 space-y-6'
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          {error && (
            <div className='rounded-md bg-red-50 dark:bg-red-900/20 p-4'>
              <div className='text-sm text-red-800 dark:text-red-300'>{error}</div>
            </div>
          )}

          <div className='-space-y-px rounded-md shadow-sm'>
            <div>
              <label
                htmlFor='username'
                className='sr-only'
              >
                Username
              </label>
              <input
                id='username'
                name='username'
                type='text'
                required
                className='relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm'
                placeholder='Username'
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor='password'
                className='sr-only'
              >
                Password
              </label>
              <input
                id='password'
                name='password'
                type='password'
                required
                className='relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm'
                placeholder='Password'
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type='submit'
              disabled={isLoading}
              className='group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950 disabled:opacity-50'
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className='text-center text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Don&apos;t have an account? </span>
            <Link
              to='/register'
              className='font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
            >
              Register here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
