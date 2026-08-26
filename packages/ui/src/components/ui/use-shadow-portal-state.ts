import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useShadowPortalTarget } from '@/lib/shadow-root-host';

interface ShadowPortalStateOptions {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ShadowPortalState {
  container: HTMLElement | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
}

/** @internal Keeps a Radix primitive's open state synchronized with its shadow portal. */
export function useShadowPortalState({
  open,
  defaultOpen,
  onOpenChange,
}: ShadowPortalStateOptions): ShadowPortalState {
  const [actualOpen, setActualOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const portalTarget = useShadowPortalTarget(actualOpen);

  return {
    container: portalTarget ?? undefined,
    open: actualOpen,
    onOpenChange: setActualOpen,
    pending: actualOpen && portalTarget === null,
  };
}
