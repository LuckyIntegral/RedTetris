import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import authReducer from '~/store/authSlice';
import { ProtectedRoute } from '~/components/auth/ProtectedRoute';

vi.mock('~/services/auth', () => ({
  authService: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
}));

import { authService } from '~/services/auth';

const renderProtectedRoute = (authState = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        hydrated: false,
        ...authState,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid='protected-content'>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  it('redirects when not hydrated and no token (hydrate runs immediately)', () => {
    vi.mocked(authService.getToken).mockReturnValue(null);
    renderProtectedRoute({ hydrated: false });
    // hydrateAuth runs via useEffect, sets hydrated=true, isAuthenticated=false → redirects
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderProtectedRoute({ hydrated: true, isAuthenticated: false });
    // When Navigate renders, the child content should not show
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with user', () => {
    renderProtectedRoute({
      hydrated: true,
      isAuthenticated: true,
      user: { id: 1, username: 'test', email: 'test@test.com', created_at: '', updated_at: '' },
    });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows loading overlay when authenticated but user is null', () => {
    renderProtectedRoute({ hydrated: true, isAuthenticated: true, user: null });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows loading overlay when isLoading is true', () => {
    renderProtectedRoute({
      hydrated: true,
      isAuthenticated: true,
      user: { id: 1, username: 'test', email: 'test@test.com', created_at: '', updated_at: '' },
      isLoading: true,
    });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('hydrates and shows content when token exists and not yet hydrated', () => {
    vi.mocked(authService.getToken).mockReturnValue('existing-token');
    vi.mocked(authService.getProfile).mockResolvedValue({
      id: 1,
      username: 'test',
      email: 'test@test.com',
      created_at: '',
      updated_at: '',
    });
    renderProtectedRoute({ hydrated: false });
    // hydrateAuth runs, finds token, sets isAuthenticated=true
    // Then fetchProfile is dispatched; meanwhile children + LoadingOverlay show
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches profile when authenticated but no user', () => {
    vi.mocked(authService.getProfile).mockResolvedValue({
      id: 1,
      username: 'test',
      email: 'test@test.com',
      created_at: '',
      updated_at: '',
    });

    renderProtectedRoute({ hydrated: true, isAuthenticated: true, user: null });
    expect(authService.getProfile).toHaveBeenCalled();
  });
});
