import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProfile } from '../../store/authSlice';
import { LoadingOverlay } from '../LoadingOverlay';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, isAuthenticated, user]);

  if (isAuthenticated) {
    return (
      <Navigate
        to='/'
        replace
      />
    );
  }

  return (
    <>
      {children}
      {(isLoading || (isAuthenticated && !user)) && <LoadingOverlay />}
    </>
  );
}
