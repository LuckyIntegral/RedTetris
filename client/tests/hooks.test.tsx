import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '~/store/authSlice';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import type { ReactNode } from 'react';

const createWrapper = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
  });

  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
};

describe('store/hooks', () => {
  describe('useAppDispatch', () => {
    it('returns a dispatch function', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAppDispatch(), { wrapper });
      expect(typeof result.current).toBe('function');
    });
  });

  describe('useAppSelector', () => {
    it('selects auth state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAppSelector((state) => state.auth.isAuthenticated), {
        wrapper,
      });
      expect(result.current).toBe(false);
    });

    it('selects user as null by default', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAppSelector((state) => state.auth.user), { wrapper });
      expect(result.current).toBeNull();
    });

    it('selects hydrated as false by default', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAppSelector((state) => state.auth.hydrated), { wrapper });
      expect(result.current).toBe(false);
    });
  });
});
