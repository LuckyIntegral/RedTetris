import { describe, it, expect } from 'vitest';
import { store } from '~/store/store';

describe('store', () => {
  it('has an auth reducer', () => {
    const state = store.getState();
    expect(state).toHaveProperty('auth');
  });

  it('auth initial state has expected shape', () => {
    const { auth } = store.getState();
    expect(auth).toHaveProperty('user');
    expect(auth).toHaveProperty('token');
    expect(auth).toHaveProperty('isAuthenticated');
    expect(auth).toHaveProperty('isLoading');
    expect(auth).toHaveProperty('error');
    expect(auth).toHaveProperty('hydrated');
  });

  it('dispatch is a function', () => {
    expect(typeof store.dispatch).toBe('function');
  });

  it('getState is a function', () => {
    expect(typeof store.getState).toBe('function');
  });
});
