import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to='/'
        replace
      />
    );
  }

  return <>{children}</>;
}
