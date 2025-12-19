import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Button } from './button';
import { XIcon } from 'lucide-react';

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
  children,
  headerChild,
  align = 'center',
  heading,
  sideOffset = 4,
  theme = 'light',
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  heading?: string;
  headerChild?: React.ReactNode;
  theme: 'light' | 'dark';
}): React.ReactNode {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-yv-sdk
        data-yv-theme={theme}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'yv:bg-popover yv:text-popover-foreground yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0 yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95 yv:data-[side=bottom]:slide-in-from-top-2 yv:data-[side=left]:slide-in-from-right-2 yv:data-[side=right]:slide-in-from-left-2 yv:data-[side=top]:slide-in-from-bottom-2 yv:z-50 yv:origin-(--radix-popover-content-transform-origin) yv:outline-hidden yv:grid yv:grid-rows-[auto_1fr_auto] yv:p-0 yv:h-full yv:max-h-[66vh] yv:w-96 yv:sm:w-sm yv:overflow-hidden yv:rounded-2xl yv:border-0 yv:shadow-lg',
          className,
        )}
        {...props}
      >
        <section className="yv:bg-muted yv:py-3 yv:w-full yv:rounded-t-2xl yv:px-4 yv:border-b yv:border-border yv:flex yv:flex-row yv:justify-between yv:items-center yv:gap-1">
          <h2 className="yv:font-bold yv:text-base">{heading}</h2>
          {headerChild}
          <PopoverClose asChild>
            <Button variant="ghost" size="icon" className="yv:w-6 yv:h-6 yv:text-muted-foreground">
              <XIcon />
              <span className="yv:sr-only">Close</span>
            </Button>
          </PopoverClose>
        </section>
        {children}
      </PopoverPrimitive.Content>
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
