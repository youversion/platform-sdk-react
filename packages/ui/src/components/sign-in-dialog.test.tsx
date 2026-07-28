import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignInDialog } from './sign-in-dialog';

describe('SignInDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    appName: 'Acme Bible',
    onConfirm: vi.fn(),
    onDecline: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the eyebrow, logo, body, and both buttons', () => {
      render(<SignInDialog {...defaultProps} />);

      // Eyebrow caption
      expect(screen.getByText('INTRODUCING')).toBeTruthy();
      // YouVersion Platform logo (svg with role img)
      expect(screen.getByRole('img', { name: 'YouVersion Platform' })).toBeTruthy();
      // Body paragraph
      expect(
        screen.getByText(/wants to connect to your YouVersion Bible App account/),
      ).toBeTruthy();
      // Primary + secondary buttons
      expect(screen.getByRole('button', { name: 'Yes Please' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'No Thanks' })).toBeTruthy();
    });

    it('does not render content when open is false', () => {
      render(<SignInDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('Integrator prompt message', () => {
    it('is hidden when promptMessage is unset', () => {
      render(<SignInDialog {...defaultProps} />);
      expect(screen.queryByText(/Loving this reading plan/)).toBeNull();
    });

    it('is shown when promptMessage is provided', () => {
      render(<SignInDialog {...defaultProps} promptMessage="Loving this reading plan?" />);
      expect(screen.getByText(/Loving this reading plan\?/)).toBeTruthy();
    });
  });

  describe('appName interpolation', () => {
    it('interpolates the appName into the body paragraph', () => {
      render(<SignInDialog {...defaultProps} appName="Acme Bible" />);
      expect(
        screen.getByText(
          'Acme Bible wants to connect to your YouVersion Bible App account. This will allow them to see and interact with your Bible App activity. Would you like to proceed?',
        ),
      ).toBeTruthy();
    });
  });

  describe('Callbacks', () => {
    it('calls onConfirm when "Yes Please" is clicked', () => {
      const onConfirm = vi.fn();
      render(<SignInDialog {...defaultProps} onConfirm={onConfirm} />);
      fireEvent.click(screen.getByRole('button', { name: 'Yes Please' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onDecline when "No Thanks" is clicked', () => {
      const onDecline = vi.fn();
      render(<SignInDialog {...defaultProps} onDecline={onDecline} />);
      fireEvent.click(screen.getByRole('button', { name: 'No Thanks' }));
      expect(onDecline).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('renders a dialog labelled by the eyebrow title', () => {
      render(<SignInDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
      // Radix wires aria-labelledby to the DialogTitle ("INTRODUCING").
      expect(dialog).toHaveAccessibleName('INTRODUCING');
    });

    it('has a described-by body paragraph', () => {
      render(<SignInDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAccessibleDescription(/wants to connect to your YouVersion Bible App/);
    });
  });

  describe('Styling', () => {
    it('has the data-yv-sdk scoping attribute', () => {
      render(<SignInDialog {...defaultProps} />);
      expect(screen.getByRole('dialog').getAttribute('data-yv-sdk')).not.toBeNull();
    });

    it('defaults to the light theme', () => {
      render(<SignInDialog {...defaultProps} />);
      expect(screen.getByRole('dialog').getAttribute('data-yv-theme')).toBe('light');
    });

    it('applies the dark theme attribute', () => {
      render(<SignInDialog {...defaultProps} theme="dark" />);
      expect(screen.getByRole('dialog').getAttribute('data-yv-theme')).toBe('dark');
    });
  });
});
