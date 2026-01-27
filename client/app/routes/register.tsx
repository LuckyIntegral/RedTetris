import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { authService } from '../services/auth';
import type { Route } from './+types/register';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Register - Red Tetris' }, { name: 'description', content: 'Create a Red Tetris account' }];
}

export default function Register() {
  const navigate = useNavigate();
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
      await authService.register({ username, email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-gray-900'>Red Tetris</h2>
          <p className='mt-2 text-center text-sm text-gray-600'>Create your account</p>
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
                className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
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
                className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
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
                className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
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
                className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm'
                placeholder='Confirm password'
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className='text-center text-sm'>
            <span className='text-gray-600'>Already have an account? </span>
            <Link
              to='/login'
              className='font-medium text-indigo-600 hover:text-indigo-500'
            >
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
