/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group';

it('keeps keyboard-hint radius independent of host custom properties', () => {
  const { container } = render(
    <InputGroup>
      <InputGroupInput aria-label="Search" />
      <InputGroupAddon>
        <kbd>⌘K</kbd>
      </InputGroupAddon>
    </InputGroup>,
  );
  const addon = container.querySelector('[data-slot="input-group-addon"]');

  expect(addon).toHaveClass('yv:[&>kbd]:rounded-[calc(var(--yv-radius)-5px)]');
  expect(addon).not.toHaveClass('yv:[&>kbd]:rounded-[calc(var(--radius)-5px)]');
});
