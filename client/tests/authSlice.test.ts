import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  hydrateAuth,
  clearError,
  setCredentials,
  registerUser,
  loginUser,
  logoutUser,
  fetchProfile,
  type AuthState,
} from '~/store/authSlice';

// Mock the auth service
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

const createStore = (preloadedState?: Partial<AuthState>) => {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: preloadedState ? { auth: { ...initialState(), ...preloadedState } } : undefined,
  });
};

const initialState = (): AuthState => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  hydrated: false,
});

describe('authSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const store = createStore();
      const state = store.getState().auth;
      expect(state).toEqual(initialState());
    });
  });

  describe('synchronous reducers', () => {
    describe('hydrateAuth', () => {
      it('sets hydrated=true and isAuthenticated=false when no token', () => {
        vi.mocked(authService.getToken).mockReturnValue(null);
        const store = createStore();
        store.dispatch(hydrateAuth());
        const state = store.getState().auth;
        expect(state.hydrated).toBe(true);
        expect(state.isAuthenticated).toBe(false);
        expect(state.token).toBeNull();
      });

      it('sets hydrated=true and isAuthenticated=true when token exists', () => {
        vi.mocked(authService.getToken).mockReturnValue('existing-token');
        const store = createStore();
        store.dispatch(hydrateAuth());
        const state = store.getState().auth;
        expect(state.hydrated).toBe(true);
        expect(state.isAuthenticated).toBe(true);
        expect(state.token).toBe('existing-token');
      });
    });

    describe('clearError', () => {
      it('clears the error field', () => {
        const store = createStore({ error: 'Some error' });
        store.dispatch(clearError());
        expect(store.getState().auth.error).toBeNull();
      });
    });

    describe('setCredentials', () => {
      it('sets user, token, isAuthenticated and calls setToken', () => {
        const store = createStore();
        const user = { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' };
        store.dispatch(setCredentials({ user, token: 'my-token' }));
        const state = store.getState().auth;
        expect(state.user).toEqual(user);
        expect(state.token).toBe('my-token');
        expect(state.isAuthenticated).toBe(true);
        expect(authService.setToken).toHaveBeenCalledWith('my-token');
      });
    });
  });

  describe('registerUser thunk', () => {
    it('sets isLoading on pending', () => {
      const store = createStore();
      // Dispatch without resolving to test pending
      vi.mocked(authService.register).mockReturnValue(new Promise(() => {}));
      store.dispatch(registerUser({ username: 'test', email: 'a@b.com', password: '123456' }));
      const state = store.getState().auth;
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets user and token on fulfilled', async () => {
      const mockData = {
        success: true,
        data: {
          user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
          token: 'reg-token',
        },
      };
      vi.mocked(authService.register).mockResolvedValue(mockData);

      const store = createStore();
      await store.dispatch(registerUser({ username: 'testuser', email: 'test@test.com', password: '123456' }));
      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.username).toBe('testuser');
      expect(state.token).toBe('reg-token');
    });

    it('sets error on rejected', async () => {
      vi.mocked(authService.register).mockRejectedValue(new Error('Username taken'));

      const store = createStore();
      await store.dispatch(registerUser({ username: 'taken', email: 'a@b.com', password: '123456' }));
      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Username taken');
    });
  });

  describe('loginUser thunk', () => {
    it('sets user and token on fulfilled', async () => {
      const mockData = {
        success: true,
        data: {
          user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
          token: 'login-token',
        },
      };
      vi.mocked(authService.login).mockResolvedValue(mockData);

      const store = createStore();
      await store.dispatch(loginUser({ username: 'testuser', password: '123456' }));
      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('login-token');
    });

    it('sets error on rejected', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

      const store = createStore();
      await store.dispatch(loginUser({ username: 'bad', password: 'wrong' }));
      const state = store.getState().auth;
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('sets isLoading on pending', () => {
      vi.mocked(authService.login).mockReturnValue(new Promise(() => {}));
      const store = createStore();
      store.dispatch(loginUser({ username: 'test', password: '123' }));
      expect(store.getState().auth.isLoading).toBe(true);
      expect(store.getState().auth.error).toBeNull();
    });
  });

  describe('logoutUser thunk', () => {
    it('clears auth state on fulfilled', async () => {
      vi.mocked(authService.logout).mockResolvedValue(undefined);

      const store = createStore({
        user: { id: 1, username: 'test', email: 'a@b.com', created_at: '', updated_at: '' },
        token: 'tok',
        isAuthenticated: true,
      });
      await store.dispatch(logoutUser());
      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('clears auth state even on rejection', async () => {
      vi.mocked(authService.logout).mockRejectedValue(new Error('Network error'));

      const store = createStore({
        user: { id: 1, username: 'test', email: 'a@b.com', created_at: '', updated_at: '' },
        token: 'tok',
        isAuthenticated: true,
      });
      await store.dispatch(logoutUser());
      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('sets isLoading on pending', () => {
      vi.mocked(authService.logout).mockReturnValue(new Promise(() => {}));
      const store = createStore();
      store.dispatch(logoutUser());
      expect(store.getState().auth.isLoading).toBe(true);
    });
  });

  describe('fetchProfile thunk', () => {
    it('sets user on fulfilled', async () => {
      const user = { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' };
      vi.mocked(authService.getProfile).mockResolvedValue(user);

      const store = createStore({ isAuthenticated: true, token: 'tok' });
      await store.dispatch(fetchProfile());
      const state = store.getState().auth;
      expect(state.user).toEqual(user);
      expect(state.isLoading).toBe(false);
    });

    it('clears auth on rejected and calls clearToken', async () => {
      vi.mocked(authService.getProfile).mockRejectedValue(new Error('Token expired'));

      const store = createStore({ isAuthenticated: true, token: 'tok' });
      await store.dispatch(fetchProfile());
      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Token expired');
      expect(authService.clearToken).toHaveBeenCalled();
    });

    it('sets isLoading and clears error on pending', () => {
      vi.mocked(authService.getProfile).mockReturnValue(new Promise(() => {}));
      const store = createStore({ error: 'old error' });
      store.dispatch(fetchProfile());
      const state = store.getState().auth;
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });
});
