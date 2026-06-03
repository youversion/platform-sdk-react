/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { YouVersionProvider } from '@/components/YouVersionProvider';

vi.mock('@youversion/platform-react-hooks', () => {
  function PassthroughProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }
  return {
    YouVersionProvider: PassthroughProvider,
    useYVAuth: vi.fn(),
  };
});

describe('Style injection via YouVersionProvider', () => {
  it('renders a <style> element in document.head with CSS content', () => {
    render(
      <YouVersionProvider appKey="test-key">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    const styles = document.head.querySelectorAll<HTMLStyleElement>('style[data-precedence="yv-sdk"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]!.getAttribute('data-precedence')).toBe('yv-sdk');
    expect(styles[0]!.textContent).toBe('');
    expect(document.body.querySelector('[data-testid="child"]')?.textContent).toBe('hello');
  });

  it('deduplicates styles when multiple providers are rendered', () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    document.body.appendChild(container1);
    document.body.appendChild(container2);

    const root1 = createRoot(container1);
    const root2 = createRoot(container2);

    act(() => {
      root1.render(<YouVersionProvider appKey="test-1">{null}</YouVersionProvider>);
      root2.render(<YouVersionProvider appKey="test-2">{null}</YouVersionProvider>);
    });

    const styles = document.head.querySelectorAll('style[data-precedence="yv-sdk"]');
    expect(styles.length).toBe(1);

    act(() => {
      root1.unmount();
      root2.unmount();
    });
    container1.remove();
    container2.remove();
  });
});
