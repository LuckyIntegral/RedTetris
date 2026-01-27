import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { authService } from '../services/auth';
import type { Route } from './+types/login';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Login - Red Tetris' }, { name: 'description', content: 'Login to Red Tetris' }];
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      await authService.login({ username, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900'>Red Tetris</h2>
          <p className='mt-2 text-center text-sm text-gray-600'>Sign in to your account</p>
        </div>

        <form
          className='mt-8 space-y-6'
          onSubmit={handleSubmit}
        >
          {error && (
            <div className='rounded-md bg-red-50 p-4'>
              <div className='text-sm text-red-800'>{error}</div>
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
                className='relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
                placeholder='Username'
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
                className='relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
                placeholder='Password'
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className='text-center text-sm'>
            <span className='text-gray-600'>Don&apos;t have an account? </span>
            <Link
              to='/register'
              className='font-medium text-indigo-600 hover:text-indigo-500'
            >
              Register here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
