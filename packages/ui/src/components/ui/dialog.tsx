import * as React from 'react';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/lib/utils';
import { useShadowDialogFocus } from './use-shadow-dialog-focus';
import { useShadowPortalState } from './use-shadow-portal-state';

interface DialogPortalState {
  container: HTMLElement | undefined;
  modal: boolean;
  open: boolean;
  pending: boolean;
}

const DialogPortalContext = React.createContext<DialogPortalState>({
  container: undefined,
  modal: true,
  open: false,
  pending: false,
});

function Dialog({
  open,
  defaultOpen,
  modal = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>): React.ReactNode {
  const portal = useShadowPortalState({
    open,
    defaultOpen,
    onOpenChange: (value) => props.onOpenChange?.(value),
  });
  const portalState = React.useMemo<DialogPortalState>(
    () => ({ container: portal.container, modal, open: portal.open, pending: portal.pending }),
    [modal, portal.container, portal.open, portal.pending],
  );

  return (
    <DialogPortalContext.Provider value={portalState}>
      <DialogPrimitive.Root
        data-slot="dialog"
        modal={modal}
        {...props}
        open={portal.open}
        onOpenChange={portal.onOpenChange}
      />
    </DialogPortalContext.Provider>
  );
}

const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  theme?: 'light' | 'dark';
};

/**
 * Shared modal chrome for the SDK's dialogs: renders the portal + overlay and a
 * centered card `Content` with the SDK's `data-yv-sdk` scope + theme attributes.
 * `className` slots between the card layout and the enter/exit animations so a
 * caller's alignment classes land where they always did (byte-equivalent
 * markup); everything else (`onEscapeKeyDown`, etc.) forwards to `Content`.
 */
function DialogContent({
  className,
  theme = 'light',
  children,
  onCloseAutoFocus,
  ref,
  ...props
}: DialogContentProps): React.ReactNode {
  const portal = React.useContext(DialogPortalContext);
  const [overlayNode, setOverlayNode] = React.useState<HTMLDivElement | null>(null);
  const [contentNode, setContentNode] = React.useState<HTMLDivElement | null>(null);
  const contentRef = useComposedRefs(ref, setContentNode);
  const shadowFocus = useShadowDialogFocus({
    container: portal.container,
    content: contentNode,
    modal: portal.modal,
    open: portal.open,
    overlay: overlayNode,
  });

  if (portal.pending) return null;

  return (
    <DialogPrimitive.Portal container={portal.container}>
      <DialogPrimitive.Overlay
        ref={setOverlayNode}
        data-slot="dialog-overlay"
        tabIndex={-1}
        className={cn(
          'yv:fixed yv:inset-0 yv:z-50 yv:bg-black/50',
          'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
          'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
        )}
      />
      <DialogPrimitive.Content
        ref={contentRef}
        data-yv-sdk
        data-yv-theme={theme}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          shadowFocus.onCloseAutoFocus(event);
        }}
        className={cn(
          'yv:fixed yv:left-1/2 yv:top-1/2 yv:z-50 yv:-translate-x-1/2 yv:-translate-y-1/2',
          'yv:w-[calc(100vw-2rem)] yv:max-w-sm',
          'yv:bg-card yv:text-foreground',
          'yv:rounded-2xl yv:p-6 yv:shadow-lg',
          className,
          'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
          'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
          'yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95',
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogContent, DialogTitle, DialogDescription };
