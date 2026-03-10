import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '~/services/auth';

describe('authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('token management', () => {
    it('setToken stores token in localStorage', () => {
      authService.setToken('test-token-123');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token-123');
    });

    it('getToken retrieves token from localStorage', () => {
      localStorage.setItem('auth_token', 'my-token');
      const token = authService.getToken();
      expect(token).toBe('my-token');
    });

    it('getToken returns null when no token exists', () => {
      const token = authService.getToken();
      expect(token).toBeNull();
    });

    it('clearToken removes token from localStorage', () => {
      localStorage.setItem('auth_token', 'my-token');
      authService.clearToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns true when token exists', () => {
      localStorage.setItem('auth_token', 'some-token');
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('register', () => {
    it('sends POST request and stores token on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
          token: 'new-token',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.register({ username: 'testuser', email: 'test@test.com', password: 'pass123' });
      expect(result.data.token).toBe('new-token');
      expect(result.data.user.username).toBe('testuser');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
    });

    it('throws error on failed registration', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { code: 'ERR', message: 'Username taken' } }),
      } as Response);

      await expect(
        authService.register({ username: 'taken', email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow('Username taken');
    });

    it('throws generic error when no message provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: {} }),
      } as Response);

      await expect(
        authService.register({ username: 'test', email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('sends POST request and stores token on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' },
          token: 'login-token',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.login({ username: 'testuser', password: 'pass123' });
      expect(result.data.token).toBe('login-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'login-token');
    });

    it('throws error on failed login', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { code: 'ERR', message: 'Invalid credentials' } }),
      } as Response);

      await expect(authService.login({ username: 'bad', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('throws generic error when no message provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: {} }),
      } as Response);

      await expect(authService.login({ username: 'test', password: '123' })).rejects.toThrow('Login failed');
    });
  });

  describe('logout', () => {
    it('sends POST with token and clears localStorage', async () => {
      localStorage.setItem('auth_token', 'my-token');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await authService.logout();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer my-token' },
        }),
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('clears token even if fetch fails', async () => {
      localStorage.setItem('auth_token', 'my-token');
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      // logout uses try/finally (no catch), so the error propagates
      await authService.logout().catch(() => {});
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('skips fetch when no token exists', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      await authService.logout();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getProfile', () => {
    it('fetches profile with auth header', async () => {
      localStorage.setItem('auth_token', 'my-token');
      const user = { id: 1, username: 'testuser', email: 'test@test.com', created_at: '', updated_at: '' };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: user }),
      } as Response);

      const result = await authService.getProfile();
      expect(result).toEqual(user);
    });

    it('throws when no token exists', async () => {
      await expect(authService.getProfile()).rejects.toThrow('No authentication token');
    });

    it('throws on failed profile fetch', async () => {
      localStorage.setItem('auth_token', 'my-token');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: { code: 'ERR', message: 'Token expired' } }),
      } as Response);

      await expect(authService.getProfile()).rejects.toThrow('Token expired');
    });

    it('throws generic error when no message in error response', async () => {
      localStorage.setItem('auth_token', 'my-token');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: {} }),
      } as Response);

      await expect(authService.getProfile()).rejects.toThrow('Failed to fetch profile');
    });
  });
});
