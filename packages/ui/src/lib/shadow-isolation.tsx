import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type ReactNode,
  type RefAttributes,
} from 'react';
import { ShadowRootHost } from './shadow-root-host';

const ShadowBoundaryReuseContext = createContext(false);

/** @internal Marks SDK-owned composition that must reuse an existing automatic boundary. */
export function ReuseShadowBoundary({ children }: { children: ReactNode }): ReactNode {
  return (
    <ShadowBoundaryReuseContext.Provider value>{children}</ShadowBoundaryReuseContext.Provider>
  );
}

/** @internal Applies automatic isolation while preserving the component ref. */
export function withShadowIsolation<P extends object, T>(
  Implementation: ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>>,
  displayName: string,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>> {
  const Isolated = forwardRef<T, P>((props, ref) => {
    const reuseBoundary = useContext(ShadowBoundaryReuseContext);
    const implementationProps: PropsWithoutRef<P> & RefAttributes<T> = {
      ...props,
      ref,
    };

    if (reuseBoundary) {
      return (
        <ShadowBoundaryReuseContext.Provider value={false}>
          {createElement(Implementation, implementationProps)}
        </ShadowBoundaryReuseContext.Provider>
      );
    }

    return (
      <ShadowRootHost>{createElement(Implementation, implementationProps)}</ShadowRootHost>
    );
  });
  Isolated.displayName = displayName;
  return Isolated;
}
