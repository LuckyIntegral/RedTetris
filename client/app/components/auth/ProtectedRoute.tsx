import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProfile, hydrateAuth } from '../../store/authSlice';
import { LoadingOverlay } from '../LoadingOverlay';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, user, hydrated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateAuth());
    }
  }, [dispatch, hydrated]);

  useEffect(() => {
    if (hydrated && isAuthenticated && !user) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, hydrated, isAuthenticated, user]);

  if (!hydrated) {
    return <LoadingOverlay />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to='/login'
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
