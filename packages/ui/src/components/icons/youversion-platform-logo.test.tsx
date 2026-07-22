import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YouVersionPlatformLogo } from './youversion-platform-logo';

describe('YouVersionPlatformLogo', () => {
  it('renders an img-role svg using the required accessible label', () => {
    render(<YouVersionPlatformLogo aria-label="YouVersion Platform" />);
    expect(screen.getByRole('img', { name: 'YouVersion Platform' })).toBeTruthy();
  });

  it('uses the caller-provided (localized) label verbatim', () => {
    render(<YouVersionPlatformLogo aria-label="Plateforme YouVersion" />);
    expect(screen.getByRole('img', { name: 'Plateforme YouVersion' })).toBeTruthy();
    // No hardcoded English default leaks through.
    expect(screen.queryByRole('img', { name: 'YouVersion Platform' })).toBeNull();
  });

  it('forwards svg props such as className', () => {
    render(<YouVersionPlatformLogo aria-label="YouVersion Platform" className="custom-class" />);
    expect(screen.getByRole('img', { name: 'YouVersion Platform' }).getAttribute('class')).toBe(
      'custom-class',
    );
  });
});
