import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '~/hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.mocked(localStorage.getItem).mockClear();
    vi.mocked(localStorage.setItem).mockClear();
  });

  it('defaults to dark theme when localStorage is empty and prefers-color-scheme is dark', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi
        .fn()
        .mockImplementation((query: string) => ({ matches: query === '(prefers-color-scheme: dark)', media: query })),
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('defaults to light theme when prefers-color-scheme is light', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query })),
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('reads theme from localStorage when stored', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('light');

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('reads dark theme from localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('adds dark class to documentElement when theme is dark', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');

    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from documentElement when theme is light', () => {
    document.documentElement.classList.add('dark');
    vi.mocked(localStorage.getItem).mockReturnValue('light');

    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme to localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');

    renderHook(() => useTheme());
    expect(localStorage.setItem).toHaveBeenCalledWith('red-tetris-theme', 'dark');
  });

  it('toggles from dark to light', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('red-tetris-theme', 'light');
  });

  it('toggles from light to dark', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('light');

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('red-tetris-theme', 'dark');
  });

  it('ignores invalid localStorage values and falls back to matchMedia', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('invalid-value');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi
        .fn()
        .mockImplementation((query: string) => ({ matches: query === '(prefers-color-scheme: dark)', media: query })),
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });
});
