import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import authReducer from '~/store/authSlice';
import { LoginForm } from '~/components/auth/LoginForm';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const renderLoginForm = (authState = {}) => {
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

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      </Provider>
    ),
  };
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form', () => {
    renderLoginForm();
    expect(screen.getByText('RED TETRIS')).toBeInTheDocument();
    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    renderLoginForm();
    expect(screen.getByText('Create one here')).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    renderLoginForm({ error: 'Invalid credentials' });
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderLoginForm({ isLoading: true });
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
  });

  it('submits the form and navigates on success', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      success: true,
      data: {
        user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
        token: 'tok',
      },
    });

    renderLoginForm();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error on failed login', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Wrong password'));

    renderLoginForm();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Wrong password')).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', () => {
    renderLoginForm({ isLoading: true });
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});
