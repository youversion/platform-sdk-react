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

type ShadowPortalStrategy = 'local-inline' | 'local-top-layer';

interface ShadowIsolationBoundaryProps {
  children: ReactNode;
  /** @internal Component-owned overlay strategy; not a public configuration surface. */
  portalStrategy?: ShadowPortalStrategy;
}

/** @internal Applies automatic isolation while honoring SDK-owned boundary reuse. */
export function ShadowIsolationBoundary({
  children,
  portalStrategy,
}: ShadowIsolationBoundaryProps): ReactNode {
  const reuseBoundary = useContext(ShadowBoundaryReuseContext);

  if (reuseBoundary) {
    return (
      <ShadowBoundaryReuseContext.Provider value={false}>
        {children}
      </ShadowBoundaryReuseContext.Provider>
    );
  }

  return <ShadowRootHost portalStrategy={portalStrategy}>{children}</ShadowRootHost>;
}

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
    const implementationProps: PropsWithoutRef<P> & RefAttributes<T> = {
      ...props,
      ref,
    };

    return (
      <ShadowIsolationBoundary>
        {createElement(Implementation, implementationProps)}
      </ShadowIsolationBoundary>
    );
  });
  Isolated.displayName = displayName;
  return Isolated;
}
