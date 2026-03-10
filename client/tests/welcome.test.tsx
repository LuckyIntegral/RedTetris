import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import authReducer from '~/store/authSlice';
import { Welcome } from '~/welcome/welcome';

vi.mock('~/services/auth', () => ({
  authService: {
    getToken: vi.fn(() => 'mock-token'),
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
    getAllGames: vi.fn(),
    computeStats: vi.fn(),
  },
}));

import { authService } from '~/services/auth';
import { gamesService } from '~/services/games';

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@test.com',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const renderWelcome = (authState = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: mockUser,
        token: 'tok',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        hydrated: true,
        ...authState,
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <Welcome />
        </MemoryRouter>
      </Provider>,
    ),
  };
};

describe('Welcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gamesService.getAllGames).mockResolvedValue([]);
    vi.mocked(gamesService.computeStats).mockReturnValue({
      gamesPlayed: 0,
      wins: 0,
      winRate: 0,
      highScore: 0,
      averageScore: 0,
      bestPlace: 0,
    });
  });

  it('renders the main heading', () => {
    renderWelcome();
    expect(screen.getByText('RED TETRIS')).toBeInTheDocument();
  });

  it('shows user information', () => {
    renderWelcome();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('displays user initial in avatar', () => {
    renderWelcome();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders PLAY NOW link', () => {
    renderWelcome();
    expect(screen.getByText('PLAY NOW')).toBeInTheDocument();
  });

  it('renders logout button and dispatches logoutUser', () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    const { store } = renderWelcome();
    const logoutBtn = screen.getByText('Logout');
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
  });

  it('shows "No games played yet" when stats show 0 games', async () => {
    renderWelcome();
    await waitFor(() => {
      expect(screen.getByText('No games played yet')).toBeInTheDocument();
    });
  });

  it('shows stats when user has games', async () => {
    vi.mocked(gamesService.getAllGames).mockResolvedValue([
      {
        game_id: 1,
        finished_at: '2025-01-01',
        players: [{ player: { id: 1, username: 'testuser' }, score: 1000, place: 1 }],
      },
    ]);
    vi.mocked(gamesService.computeStats).mockReturnValue({
      gamesPlayed: 1,
      wins: 1,
      winRate: 100,
      highScore: 1000,
      averageScore: 1000,
      bestPlace: 1,
    });

    renderWelcome();
    await waitFor(() => {
      expect(screen.getByText('Games Played')).toBeInTheDocument();
      expect(screen.getByText('High Score')).toBeInTheDocument();
      expect(screen.getByText('Wins')).toBeInTheDocument();
    });
  });

  it('shows recent games when they exist', async () => {
    const games = [
      {
        game_id: 1,
        finished_at: '2025-06-01T12:00:00Z',
        players: [{ player: { id: 1, username: 'testuser' }, score: 500, place: 1 }],
      },
    ];
    vi.mocked(gamesService.getAllGames).mockResolvedValue(games);
    vi.mocked(gamesService.computeStats).mockReturnValue({
      gamesPlayed: 1,
      wins: 1,
      winRate: 100,
      highScore: 500,
      averageScore: 500,
      bestPlace: 1,
    });

    renderWelcome();
    await waitFor(() => {
      expect(screen.getByText('Recent Games')).toBeInTheDocument();
    });
  });

  it('handles stats loading failure gracefully', async () => {
    vi.mocked(gamesService.getAllGames).mockRejectedValue(new Error('Network error'));

    renderWelcome();
    await waitFor(() => {
      expect(screen.getByText('No games played yet')).toBeInTheDocument();
    });
  });

  it('does not render user section when user is null', () => {
    renderWelcome({ user: null });
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
    expect(screen.queryByText('PLAY NOW')).not.toBeInTheDocument();
  });
});
