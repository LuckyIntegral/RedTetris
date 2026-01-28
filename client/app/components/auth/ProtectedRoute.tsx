import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProfile } from '../../store/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to='/login'
        replace
      />
    );
  }

  return <>{children}</>;
}
