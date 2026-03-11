import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from '~/components/LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders Loading... text', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the spinner element', () => {
    const { container } = render(<LoadingOverlay />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders a fixed overlay', () => {
    const { container } = render(<LoadingOverlay />);
    const overlay = container.firstElementChild;
    expect(overlay?.className).toContain('fixed');
    expect(overlay?.className).toContain('inset-0');
  });
});
