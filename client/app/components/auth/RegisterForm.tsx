import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register(username, email, password);
      void navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-white dark:bg-gray-950 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100'>
            Red Tetris
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400'>Create your account</p>
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

          <div className='space-y-4 rounded-md shadow-sm'>
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
                minLength={3}
                maxLength={50}
                pattern='[a-zA-Z0-9_-]+'
                className='relative block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm'
                placeholder='Username (3-50 characters, alphanumeric)'
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor='email'
                className='sr-only'
              >
                Email address
              </label>
              <input
                id='email'
                name='email'
                type='email'
                required
                className='relative block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm'
                placeholder='Email address'
                disabled={loading}
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
                minLength={6}
                className='relative block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm'
                placeholder='Password (minimum 6 characters)'
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor='confirmPassword'
                className='sr-only'
              >
                Confirm Password
              </label>
              <input
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                required
                minLength={6}
                className='relative block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:z-10 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm'
                placeholder='Confirm password'
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950 disabled:opacity-50'
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className='text-center text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Already have an account? </span>
            <Link
              to='/login'
              className='font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
            >
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
