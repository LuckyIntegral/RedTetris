import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authService, type User, type RegisterData, type LoginData } from '../services/auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  hydrated: false,
};

// Async thunks
export const registerUser = createAsyncThunk('auth/register', async (data: RegisterData, { rejectWithValue }) => {
  try {
    const response = await authService.register(data);
    return response.data;
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const loginUser = createAsyncThunk('auth/login', async (data: LoginData, { rejectWithValue }) => {
  try {
    const response = await authService.login(data);
    return response.data;
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const fetchProfile = createAsyncThunk('auth/profile', async (_, { rejectWithValue }) => {
  try {
    const user = await authService.getProfile();
    return user;
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrateAuth: (state) => {
      const token = authService.getToken();
      state.token = token;
      state.isAuthenticated = !!token;
      state.hydrated = true;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      authService.setToken(action.payload.token);
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // If profile fetch fails, clear auth state
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        authService.clearToken();
      });
  },
});

export const { hydrateAuth, clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
