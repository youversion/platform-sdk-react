import {
  createElement,
  forwardRef,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
} from 'react';
import { tailwindStylesheet } from './embedded-styles';
import { ShadowRootHost } from './shadow-root-host';

/** @internal Applies automatic isolation while preserving the component ref. */
export function withShadowIsolation<P extends object, T>(
  Implementation: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>>,
  displayName: string,
  cssText: string = tailwindStylesheet,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>> {
  const Isolated = forwardRef<T, P>((props, ref) => {
    const implementationProps: PropsWithoutRef<P> & RefAttributes<T> = {
      ...props,
      ref,
    };

    return (
      <ShadowRootHost cssText={cssText}>
        {createElement(Implementation, implementationProps)}
      </ShadowRootHost>
    );
  });
  Isolated.displayName = displayName;
  return Isolated;
}
