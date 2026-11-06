/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { InputGroup, InputGroupAddon } from './input-group';

it('uses the SDK-owned --yv-radius for kbd rounding', () => {
  const { container } = render(
    <InputGroup>
      <InputGroupAddon />
    </InputGroup>,
  );
  const addon = container.querySelector('[data-slot="input-group-addon"]');

  expect(addon).toHaveClass('yv:[&>kbd]:rounded-[calc(var(--yv-radius)-5px)]');
});
