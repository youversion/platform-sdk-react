import {
  createElement,
  forwardRef,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
} from 'react';
import { ShadowRootHost } from './shadow-root-host';

/** @internal Applies automatic isolation while preserving the component ref. */
export function withShadowIsolation<P extends object, T>(
  Implementation: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>>,
  displayName: string,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>> {
  const Isolated = forwardRef<T, P>((props, ref) => (
    <ShadowRootHost>
      {createElement(Implementation, {
        ...(props as P),
        ref,
      } as unknown as PropsWithoutRef<P> & RefAttributes<T>)}
    </ShadowRootHost>
  ));
  Isolated.displayName = displayName;
  return Isolated;
}
