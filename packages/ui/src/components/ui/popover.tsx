import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Button } from './button';
import { handleShadowPopoverTabLoop } from './shadow-popover-tab-loop';
import { useShadowPortalState } from './use-shadow-portal-state';
import { XIcon } from '../icons/x';

import { cn } from '@/lib/utils';
import { useInterfaceDirection } from '@/lib/direction';

interface PopoverPortalState {
  awaitingPortalTarget: boolean;
  container: HTMLElement | undefined;
}

const PopoverPortalContext = React.createContext<PopoverPortalState>({
  awaitingPortalTarget: false,
  container: undefined,
});

function Popover({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>): React.ReactNode {
  const portal = useShadowPortalState({
    open,
    defaultOpen,
    onOpenChange,
  });
  const portalState = React.useMemo<PopoverPortalState>(
    () => ({
      awaitingPortalTarget: portal.awaitingPortalTarget,
      container: portal.container,
    }),
    [portal.awaitingPortalTarget, portal.container],
  );

  return (
    <PopoverPortalContext.Provider value={portalState}>
      <PopoverPrimitive.Root
        data-slot="popover"
        open={portal.open}
        onOpenChange={portal.onOpenChange}
        {...props}
      />
    </PopoverPortalContext.Provider>
  );
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>): React.ReactNode {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  children,
  headerLeading,
  headerChild,
  headerClassName,
  closeButtonClassName,
  align = 'center',
  heading,
  headingDescription,
  showHeader = true,
  showClose = true,
  sideOffset = 4,
  theme = 'light',
  onKeyDown,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  showHeader?: boolean;
  showClose?: boolean;
  heading?: React.ReactNode;
  headingDescription?: React.ReactNode;
  headerLeading?: React.ReactNode;
  headerChild?: React.ReactNode;
  /** Overrides the shared muted header shell (e.g. version picker flat header). */
  headerClassName?: string;
  /** Overrides the shared Close button classes (e.g. version picker bordered Close). */
  closeButtonClassName?: string;
  theme?: 'light' | 'dark';
}): React.ReactNode {
  const { t } = useTranslation(undefined, { i18n });
  const direction = useInterfaceDirection();
  const portal = React.useContext(PopoverPortalContext);
  const generatedHeadingId = React.useId();
  const normalizedAriaLabel = ariaLabel?.trim() || undefined;
  const normalizedAriaLabelledBy = ariaLabelledBy?.trim() || undefined;
  const headingId =
    showHeader && heading != null && !normalizedAriaLabel && !normalizedAriaLabelledBy
      ? generatedHeadingId
      : undefined;

  if (portal.awaitingPortalTarget) return null;

  return (
    <PopoverPrimitive.Portal container={portal.container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-yv-sdk
        data-yv-theme={theme}
        dir={direction}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          handleShadowPopoverTabLoop(event);
        }}
        className={cn(
          'yv:bg-popover yv:text-popover-foreground yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0 yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95 yv:data-[side=bottom]:slide-in-from-top-2 yv:data-[side=left]:slide-in-from-right-2 yv:data-[side=right]:slide-in-from-left-2 yv:data-[side=top]:slide-in-from-bottom-2 yv:z-50 yv:origin-(--radix-popover-content-transform-origin) yv:outline-hidden yv:grid yv:grid-rows-[auto_1fr_auto] yv:p-0 yv:h-full yv:max-h-[min(66svh,var(--radix-popover-content-available-height))] yv:max-sm:max-w-[calc(100vw-2rem)] yv:w-sm yv:sm:max-w-sm yv:overflow-hidden yv:rounded-2xl yv:border-0 yv:shadow-lg',
          className,
        )}
        {...props}
        aria-label={normalizedAriaLabel}
        aria-labelledby={normalizedAriaLabelledBy ?? headingId}
      >
        {showHeader ? (
          <section
            className={cn(
              'yv:bg-muted yv:py-3 yv:rounded-t-2xl yv:px-4 yv:border-b yv:border-border yv:grid yv:justify-between yv:items-center yv:gap-2',
              popoverHeaderColumns(Boolean(headerLeading), Boolean(headerChild), showClose),
              headerClassName,
            )}
          >
            {headerLeading}
            <div className="yv:min-w-0 yv:flex yv:flex-col">
              <h2 id={headingId} className="yv:font-bold yv:text-base yv:leading-[1.25]">
                {heading}
              </h2>
              {headingDescription ? (
                <p className="yv:text-[10px]! yv:font-medium! yv:leading-4 yv:text-muted-foreground">
                  {headingDescription}
                </p>
              ) : null}
            </div>
            {headerChild}
            {showClose ? (
              <PopoverClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('yv:w-6 yv:h-6 yv:text-muted-foreground', closeButtonClassName)}
                >
                  <XIcon className="yv:size-5" />
                  <span className="yv:sr-only">{t('closeAriaLabel')}</span>
                </Button>
              </PopoverClose>
            ) : null}
          </section>
        ) : null}
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function popoverHeaderColumns(hasLeading: boolean, hasChild: boolean, showClose: boolean): string {
  if (hasLeading && hasChild && showClose) return 'yv:grid-cols-[auto_1fr_auto_auto]';
  if (hasLeading && (hasChild || showClose)) return 'yv:grid-cols-[auto_1fr_auto]';
  if (hasLeading) return 'yv:grid-cols-[auto_1fr]';
  if (hasChild && showClose) return 'yv:grid-cols-[1fr_auto_auto]';
  if (hasChild || showClose) return 'yv:grid-cols-[1fr_auto]';
  return 'yv:grid-cols-[1fr]';
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close>): React.ReactNode {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
