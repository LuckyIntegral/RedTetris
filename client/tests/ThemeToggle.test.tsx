import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '~/components/ThemeToggle';

describe('ThemeToggle', () => {
  it('renders sun icon in dark mode', () => {
    const { container } = render(
      <ThemeToggle
        theme='dark'
        toggle={vi.fn()}
      />
    );
    const icon = container.querySelector('span[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
    expect(icon?.classList.contains('text-yellow-400')).toBe(true);
    expect(icon?.textContent).toBe('☀');
  });

  it('renders moon icon in light mode', () => {
    const { container } = render(
      <ThemeToggle
        theme='light'
        toggle={vi.fn()}
      />
    );
    const icon = container.querySelector('span[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
    expect(icon?.classList.contains('text-slate-600')).toBe(true);
    expect(icon?.textContent).toBe('☾');
  });

  it('has correct aria-label for dark mode (switch to light)', () => {
    render(
      <ThemeToggle
        theme='dark'
        toggle={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
  });

  it('has correct aria-label for light mode (switch to dark)', () => {
    render(
      <ThemeToggle
        theme='light'
        toggle={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
  });

  it('has correct title for dark mode', () => {
    render(
      <ThemeToggle
        theme='dark'
        toggle={vi.fn()}
      />
    );
    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument();
  });

  it('has correct title for light mode', () => {
    render(
      <ThemeToggle
        theme='light'
        toggle={vi.fn()}
      />
    );
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
  });

  it('calls toggle when clicked', () => {
    const toggle = vi.fn();
    render(
      <ThemeToggle
        theme='dark'
        toggle={toggle}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(toggle).toHaveBeenCalledOnce();
  });

  it('renders as a button element', () => {
    render(
      <ThemeToggle
        theme='dark'
        toggle={vi.fn()}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });
});
