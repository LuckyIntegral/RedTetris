import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router';
import authReducer from '~/store/authSlice';

// Mock services
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

vi.mock('~/services/games', () => ({
  gamesService: {
    getAllGames: vi.fn().mockResolvedValue([]),
    computeStats: vi
      .fn()
      .mockReturnValue({ gamesPlayed: 0, wins: 0, winRate: 0, highScore: 0, averageScore: 0, bestPlace: 0 }),
  },
}));

vi.mock('~/components/game/GamePage', () => ({
  GamePage: ({ initialRoom }: { initialRoom?: string }) => (
    <div data-testid='game-page'>GamePage: {initialRoom ?? 'no-room'}</div>
  ),
}));

const createStore = (authState = {}) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        hydrated: true,
        ...authState,
      },
    },
  });

describe('Route: Login', () => {
  it('renders login form inside PublicOnlyRoute (unauthenticated)', async () => {
    const { default: Login } = await import('~/routes/login');
    const store = createStore({ hydrated: true, isAuthenticated: false });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
  });
});

describe('Route: Register', () => {
  it('renders register form inside PublicOnlyRoute (unauthenticated)', async () => {
    const { default: Register } = await import('~/routes/register');
    const store = createStore({ hydrated: true, isAuthenticated: false });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Join the Game!')).toBeInTheDocument();
  });
});

describe('Route: Home', () => {
  it('renders ProtectedRoute with Welcome when authenticated', async () => {
    const { default: Home } = await import('~/routes/home');
    const store = createStore({
      hydrated: true,
      isAuthenticated: true,
      user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('RED TETRIS')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});

describe('Route meta functions', () => {
  it('login meta returns correct title', async () => {
    const { meta } = await import('~/routes/login');
    const result = meta({} as any);
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Login - Red Tetris' })]));
  });

  it('register meta returns correct title', async () => {
    const { meta } = await import('~/routes/register');
    const result = meta({} as any);
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Register - Red Tetris' })]));
  });

  it('home meta returns correct title', async () => {
    const { meta } = await import('~/routes/home');
    const result = meta({} as any);
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Red Tetris - Home' })]));
  });
});

describe('Route: Join', () => {
  it('renders GamePage with initialRoom from URL params when authenticated', async () => {
    const { default: JoinRoute } = await import('~/routes/join');
    const store = createStore({
      hydrated: true,
      isAuthenticated: true,
      user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my-room/host-player']}>
          <Routes>
            <Route
              path='/:room/:playerName'
              element={<JoinRoute />}
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('game-page')).toBeInTheDocument();
    expect(screen.getByText('GamePage: my-room')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', async () => {
    const { default: JoinRoute } = await import('~/routes/join');
    const store = createStore({ hydrated: true, isAuthenticated: false });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my-room/host-player']}>
          <Routes>
            <Route
              path='/:room/:playerName'
              element={<JoinRoute />}
            />
            <Route
              path='/login'
              element={<div>Login Page</div>}
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.queryByTestId('game-page')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
