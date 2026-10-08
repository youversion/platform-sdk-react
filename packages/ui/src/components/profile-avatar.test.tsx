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
  it('derives uppercase initials from the first and last words', () => {
    renderProfileAvatar({ name: 'Cam Michael Anderson' });
    expect(screen.getByText('CA')).toBeInTheDocument();

    renderProfileAvatar({ name: 'cam anderson' });
    expect(screen.getAllByText('CA')).toHaveLength(2);
  });

  it('forwards class names, DOM props, clicks, and its Radix ref', async () => {
    const ref = createRef<HTMLSpanElement>();
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <ReuseShadowBoundary>
        <ProfileAvatar
          name="Cam Anderson"
          ref={ref}
          className="consumer-avatar"
          onClick={onClick}
          data-consumer="avatar"
        />
      </ReuseShadowBoundary>,
    );

    const avatar = screen.getByLabelText('Cam Anderson');
    await user.click(avatar);

    expect(avatar).toHaveAttribute('data-consumer', 'avatar');
    expect(avatar).toHaveClass('consumer-avatar');
    expect(onClick).toHaveBeenCalledOnce();
    expect(ref.current).toBe(avatar);
  });
});
