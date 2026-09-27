import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ComponentProps } from 'react';
import { ReuseShadowBoundary } from '@/lib/shadow-isolation';
import { ProfileAvatar } from './profile-avatar';

function renderProfileAvatar(props: ComponentProps<typeof ProfileAvatar>) {
  return render(
    <ReuseShadowBoundary>
      <ProfileAvatar {...props} />
    </ReuseShadowBoundary>,
  );
}

// Note: Radix AvatarImage only renders after the image load event fires, which
// never happens in jsdom — image rendering is covered by the Storybook
// integration tests in profile-avatar.stories.tsx.
describe('ProfileAvatar', () => {
  it('renders two-letter initials when no image URL is present', () => {
    renderProfileAvatar({ name: 'Cam Anderson' });
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('uses first and last word for names with middle names', () => {
    renderProfileAvatar({ name: 'Cam Michael Anderson' });
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('uppercases the initials', () => {
    renderProfileAvatar({ name: 'cam anderson' });
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('handles single-name inputs', () => {
    renderProfileAvatar({ name: 'Cher' });
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders an empty circle for empty names without crashing', () => {
    const { container } = renderProfileAvatar({ name: '' });
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('');
  });

  it('renders an empty circle for missing names without crashing', () => {
    const { container } = renderProfileAvatar({});
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('');
  });

  it('sets aria-label to the full name', () => {
    const { container } = renderProfileAvatar({ name: 'Cam Anderson' });
    expect(container.querySelector('[data-slot="avatar"]')).toHaveAttribute(
      'aria-label',
      'Cam Anderson',
    );
  });

  it('renders an empty circle for whitespace-only names without crashing', () => {
    const { container } = renderProfileAvatar({ name: '   ' });
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('');
  });

  it('forwards DOM props, clicks, and its Radix ref to the production avatar element', async () => {
    const ref = createRef<HTMLSpanElement>();
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <ReuseShadowBoundary>
        <ProfileAvatar name="Cam Anderson" ref={ref} onClick={onClick} data-consumer="avatar" />
      </ReuseShadowBoundary>,
    );

    const avatar = screen.getByLabelText('Cam Anderson');
    await user.click(avatar);

    expect(avatar).toHaveAttribute('data-consumer', 'avatar');
    expect(onClick).toHaveBeenCalledOnce();
    expect(ref.current).toBe(avatar);
  });
});
