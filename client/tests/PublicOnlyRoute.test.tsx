import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import authReducer from '~/store/authSlice';
import { PublicOnlyRoute } from '~/components/auth/PublicOnlyRoute';

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

const renderPublicOnlyRoute = (authState = {}) => {
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
        <PublicOnlyRoute>
          <div data-testid='public-content'>Public Content</div>
        </PublicOnlyRoute>
      </MemoryRouter>
    </Provider>
  );
};

describe('PublicOnlyRoute', () => {
  it('renders children after hydration when not authenticated', () => {
    vi.mocked(authService.getToken).mockReturnValue(null);
    renderPublicOnlyRoute({ hydrated: false });
    // hydrateAuth fires immediately, sets hydrated=true, isAuthenticated=false → renders children
    expect(screen.getByTestId('public-content')).toBeInTheDocument();
  });

  it('redirects to / when authenticated', () => {
    renderPublicOnlyRoute({ hydrated: true, isAuthenticated: true });
    // Navigate to / should fire, content should not show
    expect(screen.queryByTestId('public-content')).not.toBeInTheDocument();
  });

  it('renders children when not authenticated', () => {
    renderPublicOnlyRoute({ hydrated: true, isAuthenticated: false });
    expect(screen.getByTestId('public-content')).toBeInTheDocument();
  });

  it('shows loading overlay when isLoading and not authenticated', () => {
    renderPublicOnlyRoute({ hydrated: true, isAuthenticated: false, isLoading: true });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('public-content')).toBeInTheDocument();
  });

  it('redirects when hydrated with token (not hydrated initially)', () => {
    vi.mocked(authService.getToken).mockReturnValue('existing-token');
    renderPublicOnlyRoute({ hydrated: false });
    expect(screen.queryByTestId('public-content')).not.toBeInTheDocument();
  });

  it('fetches profile when authenticated but no user', () => {
    vi.mocked(authService.getProfile).mockResolvedValue({
      id: 1,
      username: 'test',
      email: 'test@test.com',
      created_at: '',
      updated_at: '',
    });

    renderPublicOnlyRoute({ hydrated: true, isAuthenticated: true, user: null });
    expect(authService.getProfile).toHaveBeenCalled();
  });
});
