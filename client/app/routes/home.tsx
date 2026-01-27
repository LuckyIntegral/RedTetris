import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Red Tetris' }, { name: 'description', content: 'Welcome to Red Tetris!' }];
}

export default function Home() {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-lg'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 px-4'>
      <div className='w-full max-w-2xl rounded-lg bg-white p-8 shadow-2xl'>
        <h1 className='mb-6 text-center text-4xl font-bold text-gray-900'>Red Tetris</h1>

        {isAuthenticated ? (
          <div className='space-y-6'>
            <div className='rounded-lg bg-green-50 p-4'>
              <p className='text-center text-lg font-medium text-green-800'>
                Welcome back, <span className='font-bold'>{user?.username}</span>!
              </p>
              <p className='mt-1 text-center text-sm text-green-600'>{user?.email}</p>
            </div>

            <div className='space-y-3'>
              <button className='w-full rounded-md bg-indigo-600 px-4 py-3 text-lg font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'>
                Start Game
              </button>

              <button className='w-full rounded-md bg-purple-600 px-4 py-3 text-lg font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'>
                Join Game
              </button>

              <button
                onClick={logout}
                className='w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <p className='text-center text-gray-600'>Sign in or create an account to start playing!</p>

            <div className='space-y-3'>
              <Link
                to='/login'
                className='block w-full rounded-md bg-indigo-600 px-4 py-3 text-center text-lg font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              >
                Sign In
              </Link>

              <Link
                to='/register'
                className='block w-full rounded-md border border-indigo-600 bg-white px-4 py-3 text-center text-lg font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
