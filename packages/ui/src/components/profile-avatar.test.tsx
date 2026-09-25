import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileAvatar } from './profile-avatar';

// Note: Radix AvatarImage only renders after the image load event fires, which
// never happens in jsdom — image rendering is covered by the Storybook
// integration tests in profile-avatar.stories.tsx.
describe('ProfileAvatar', () => {
  it('derives uppercase initials from the first and last words', () => {
    render(<ProfileAvatar name="Cam Michael Anderson" />);
    expect(screen.getByText('CA')).toBeInTheDocument();

    render(<ProfileAvatar name="cam anderson" />);
    expect(screen.getAllByText('CA')).toHaveLength(2);
  });
});
