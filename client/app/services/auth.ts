const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

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

class AuthService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
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
    this.setToken(successResult.data.token);
    return successResult;
  }

  async login(data: LoginData): Promise<AuthResponse> {
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
    this.setToken(successResult.data.token);
    return successResult;
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
        });
      }
    } finally {
      this.clearToken();
    }
  }

  async getProfile(): Promise<User> {
    if (!this.token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const result = (await response.json()) as { success: boolean; data: User } | ErrorResponse;

    if (!response.ok) {
      const errorResult = result as ErrorResponse;
      throw new Error(errorResult.error?.message ?? 'Failed to fetch profile');
    }

    return (result as { success: boolean; data: User }).data;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const authService = new AuthService();
