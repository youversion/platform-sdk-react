/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button — default variant colors', () => {
  it('paints the primary surface, not background-on-foreground (regression: invisible button)', () => {
    // The `default` variant must pair `bg-primary` with `text-primary-foreground`.
    // The previous `bg-background` + `text-primary-foreground` pairing resolved to
    // white-on-white in the light theme, so the Continue button on the highlight
    // permission dialog was invisible. Guard against regressing to that pairing.
    const { getByRole } = render(<Button>Continue</Button>);
    const className = getByRole('button').className;

    expect(className).toContain('yv:bg-primary');
    expect(className).toContain('yv:text-primary-foreground');
    expect(className).not.toContain('yv:bg-background');
  });
});
