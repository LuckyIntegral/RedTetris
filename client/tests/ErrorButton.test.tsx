import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ErrorButton from '~/components/ErrorButton';

describe('ErrorButton', () => {
  it('renders button text', () => {
    render(<ErrorButton />);
    expect(screen.getByRole('button', { name: 'Break the world' })).toBeInTheDocument();
  });

  it('includes the red button styling classes', () => {
    render(<ErrorButton />);
    const button = screen.getByRole('button', { name: 'Break the world' });

    expect(button.className).toContain('bg-red-600');
    expect(button.className).toContain('hover:bg-red-500');
  });

  it('throws the expected error when clicked', () => {
    const element = ErrorButton();
    const { onClick } = element.props as { onClick?: () => void };

    expect(onClick).toBeTypeOf('function');

    if (!onClick) {
      throw new Error('Expected onClick handler to be defined');
    }

    expect(() => onClick()).toThrowError('This is a test error from the ErrorButton component');
  });
});
