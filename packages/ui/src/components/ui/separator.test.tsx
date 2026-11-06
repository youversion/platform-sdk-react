import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReuseShadowBoundary } from '@/lib/shadow-isolation';
import { Separator } from './separator';

describe('Separator', () => {
  it('preserves semantics while forwarding class names, DOM props, clicks, and its Radix ref', async () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ReuseShadowBoundary>
        <Separator
          data-testid="separator"
          data-consumer="separator"
          ref={ref}
          className="consumer-separator"
          onClick={onClick}
        />
      </ReuseShadowBoundary>,
    );

    const decorative = screen.getByTestId('separator');
    expect(decorative).toHaveAttribute('role', 'none');
    expect(decorative).toHaveAttribute('data-orientation', 'horizontal');
    expect(decorative).toHaveAttribute('data-consumer', 'separator');
    expect(decorative).toHaveClass('consumer-separator');
    expect(ref.current).toBe(decorative);
    await user.click(decorative);
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <ReuseShadowBoundary>
        <Separator data-testid="separator" decorative={false} />
      </ReuseShadowBoundary>,
    );
    expect(screen.getByRole('separator')).toHaveAttribute('data-orientation', 'horizontal');

    rerender(
      <ReuseShadowBoundary>
        <Separator data-testid="separator" decorative={false} orientation="vertical" />
      </ReuseShadowBoundary>,
    );
    const vertical = screen.getByRole('separator');
    expect(vertical).toHaveAttribute('aria-orientation', 'vertical');
    expect(vertical).toHaveAttribute('data-orientation', 'vertical');
  });
});
