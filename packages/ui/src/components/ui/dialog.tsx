import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '../../lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>): React.ReactElement {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'yv:fixed yv:inset-0 yv:z-50 yv:bg-black/50',
        'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
        'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

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
  ...props
}: DialogContentProps): React.ReactElement {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-yv-sdk
        data-yv-theme={theme}
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

export { Dialog, DialogOverlay, DialogContent, DialogTitle, DialogDescription };
