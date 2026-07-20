import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileAvatar } from './profile-avatar';

// Note: Radix AvatarImage only renders after the image load event fires, which
// never happens in jsdom — image rendering is covered by the Storybook
// integration tests in profile-avatar.stories.tsx.
describe('ProfileAvatar', () => {
  it('renders two-letter initials when no image URL is present', () => {
    render(<ProfileAvatar name="Cam Anderson" />);
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('uses first and last word for names with middle names', () => {
    render(<ProfileAvatar name="Cam Michael Anderson" />);
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('uppercases the initials', () => {
    render(<ProfileAvatar name="cam anderson" />);
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('handles single-name inputs', () => {
    render(<ProfileAvatar name="Cher" />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders an empty circle for empty names without crashing', () => {
    const { container } = render(<ProfileAvatar name="" />);
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('');
  });

  it('renders an empty circle for missing names without crashing', () => {
    const { container } = render(<ProfileAvatar />);
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('');
  });

  it('sets aria-label to the full name', () => {
    const { container } = render(<ProfileAvatar name="Cam Anderson" />);
    expect(container.querySelector('[data-slot="avatar"]')).toHaveAttribute(
      'aria-label',
      'Cam Anderson',
    );
  });

  it('renders an empty circle for whitespace-only names without crashing', () => {
    const { container } = render(<ProfileAvatar name="   " />);
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('');
  });
});
