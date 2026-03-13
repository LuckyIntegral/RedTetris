import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerUser, clearError } from '../../store/authSlice';

export function RegisterForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { error: reduxError, isLoading } = useAppSelector((state) => state.auth);
  const [localError, setLocalError] = useState<string>('');

  const error = localError || reduxError;

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    const result = await dispatch(registerUser({ username, email, password }));
    if (registerUser.fulfilled.match(result)) {
      void navigate('/');
    }
  };

  return (
    <main className='min-h-screen bg-page flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-5xl font-bold text-red-500 mb-4'>RED TETRIS</h1>
          <p className='text-xl text-on-surface-variant'>Join the Game!</p>
          <p className='text-on-surface-muted mt-2'>Create your account to start playing</p>
        </div>

        {/* Register Form */}
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
                  minLength={3}
                  maxLength={50}
                  pattern='[a-zA-Z0-9_-]+'
                  className='w-full bg-surface-alt border border-outline rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors'
                  placeholder='Choose a unique username (3-50 chars)'
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-on-surface-muted mb-2'
                >
                  Email Address
                </label>
                <input
                  id='email'
                  name='email'
                  type='email'
                  required
                  className='w-full bg-surface-alt border border-outline rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors'
                  placeholder='Enter your email address'
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
                  minLength={6}
                  className='w-full bg-surface-alt border border-outline rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors'
                  placeholder='Create a strong password (6+ chars)'
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-medium text-on-surface-muted mb-2'
                >
                  Confirm Password
                </label>
                <input
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  required
                  minLength={6}
                  className='w-full bg-surface-alt border border-outline rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-faint focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors'
                  placeholder='Confirm your password'
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
                  <span className='animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block'></span>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>

            <div className='text-center pt-4 border-t border-outline-variant'>
              <p className='text-on-surface-muted text-sm'>
                Already have an account?{' '}
                <Link
                  to='/login'
                  className='text-red-400 hover:text-red-300 font-medium hover:underline transition-colors'
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
