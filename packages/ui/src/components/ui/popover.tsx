import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>): React.ReactNode {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>): React.ReactNode {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>): React.ReactNode {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'yv:bg-popover yv:text-popover-foreground yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0 yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95 yv:data-[side=bottom]:slide-in-from-top-2 yv:data-[side=left]:slide-in-from-right-2 yv:data-[side=right]:slide-in-from-left-2 yv:data-[side=top]:slide-in-from-bottom-2 yv:z-50 yv:w-72 yv:origin-(--radix-popover-content-transform-origin) yv:rounded-md yv:border yv:p-4 yv:shadow-md yv:outline-hidden',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>): React.ReactNode {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close>): React.ReactNode {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose };
