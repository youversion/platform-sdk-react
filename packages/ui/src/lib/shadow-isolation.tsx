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
import { useTheme } from '@youversion/platform-react-hooks';
import { ShadowRootHost } from './shadow-root-host';

const ShadowBoundaryReuseContext = createContext(false);

type ShadowPortalStrategy = 'local-inline' | 'local-top-layer';

interface ShadowIsolationBoundaryProps {
  children: ReactNode;
  /** @internal Keeps inline public roots valid in phrasing content. */
  hostElement?: 'div' | 'span';
  /** @internal Component-owned overlay strategy; not a public configuration surface. */
  portalStrategy?: ShadowPortalStrategy;
  /** @internal Component-resolved theme when it intentionally overrides the provider. */
  theme?: 'light' | 'dark';
  /** @internal Lets this component remain shrinkable in a constrained block-size track. */
  constrainBlockSize?: boolean;
}

/** @internal Applies automatic isolation while honoring SDK-owned boundary reuse. */
export function ShadowIsolationBoundary({
  children,
  hostElement,
  portalStrategy,
  theme,
  constrainBlockSize,
}: ShadowIsolationBoundaryProps): ReactNode {
  const reuseBoundary = useContext(ShadowBoundaryReuseContext);
  const providerTheme = useTheme();

  if (reuseBoundary) {
    return (
      <ShadowBoundaryReuseContext.Provider value={false}>
        {children}
      </ShadowBoundaryReuseContext.Provider>
    );
  }

  return (
    <ShadowRootHost
      hostElement={hostElement}
      portalStrategy={portalStrategy}
      theme={theme ?? providerTheme}
      constrainBlockSize={constrainBlockSize}
    >
      {children}
    </ShadowRootHost>
  );
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
  options?: { hostElement?: 'div' | 'span' },
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<T>> {
  const Isolated = forwardRef<T, P>((props, ref) => {
    const implementationProps: PropsWithoutRef<P> & RefAttributes<T> = {
      ...props,
      ref,
    };

    return (
      <ShadowIsolationBoundary hostElement={options?.hostElement}>
        {createElement(Implementation, implementationProps)}
      </ShadowIsolationBoundary>
    );
  });
  Isolated.displayName = displayName;
  return Isolated;
}
