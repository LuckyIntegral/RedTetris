const API_URL = (import.meta.env.VITE_SERVER_URL as string) ?? 'http://localhost:3002';

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  data: { user: User; token: string };
}

export interface ErrorResponse {
  success: boolean;
  error: { code: string; message: string };
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

const createAuthService = () => {
  const setToken = (newToken: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', newToken);
    }
  };

  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  const clearToken = (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  };

  const register = async (data: RegisterData): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as AuthResponse | ErrorResponse;

    if (!response.ok) {
      const errorResult = result as ErrorResponse;
      throw new Error(errorResult.error?.message ?? 'Registration failed');
    }

    const successResult = result as AuthResponse;
    setToken(successResult.data.token);
    return successResult;
  };

  const login = async (data: LoginData): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = (await response.json()) as AuthResponse | ErrorResponse;

    if (!response.ok) {
      const errorResult = result as ErrorResponse;
      throw new Error(errorResult.error?.message ?? 'Login failed');
    }

    const successResult = result as AuthResponse;
    setToken(successResult.data.token);
    return successResult;
  };

  const logout = async (): Promise<void> => {
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
    } finally {
      clearToken();
    }
  };

  const getProfile = async (): Promise<User> => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = (await response.json()) as { success: boolean; data: User } | ErrorResponse;

    if (!response.ok) {
      const errorResult = result as ErrorResponse;
      throw new Error(errorResult.error?.message ?? 'Failed to fetch profile');
    }

    return (result as { success: boolean; data: User }).data;
  };

  const isAuthenticated = (): boolean => {
    return !!getToken();
  };

  return { setToken, getToken, clearToken, register, login, logout, getProfile, isAuthenticated };
};

export const authService = createAuthService();
