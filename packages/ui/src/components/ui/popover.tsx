import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Button } from './button';
import { XIcon } from '../icons/x';

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
  showHeader = true,
  sideOffset = 4,
  theme = 'light',
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  showHeader?: boolean;
  heading?: string;
  headerChild?: React.ReactNode;
  theme?: 'light' | 'dark';
}): React.ReactNode {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-yv-sdk
        data-yv-theme={theme}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn(
          'yv:bg-popover yv:text-popover-foreground yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0 yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95 yv:data-[side=bottom]:slide-in-from-top-2 yv:data-[side=left]:slide-in-from-right-2 yv:data-[side=right]:slide-in-from-left-2 yv:data-[side=top]:slide-in-from-bottom-2 yv:z-50 yv:origin-(--radix-popover-content-transform-origin) yv:outline-hidden yv:grid yv:grid-rows-[auto_1fr_auto] yv:p-0 yv:h-full yv:max-h-[66svh] yv:max-sm:max-w-[calc(100vw-2rem)] yv:w-sm yv:sm:max-w-sm yv:overflow-hidden yv:rounded-2xl yv:border-0 yv:shadow-lg',
          className,
        )}
        {...props}
      >
        {showHeader ? (
          <section
            className={cn([
              'yv:bg-muted yv:py-3 yv:rounded-t-2xl yv:px-4 yv:border-b yv:border-border yv:grid yv:grid-cols-[1fr_auto] yv:justify-between yv:items-center yv:gap-2',
              headerChild ? 'yv:grid-cols-[1fr_auto_auto]' : '',
            ])}
          >
            <h2 className="yv:font-bold yv:text-base">{heading}</h2>
            {headerChild}
            <PopoverClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="yv:w-6 yv:h-6 yv:text-muted-foreground"
              >
                <XIcon className="yv:size-5" />
                <span className="yv:sr-only">Close</span>
              </Button>
            </PopoverClose>
          </section>
        ) : null}
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close>): React.ReactNode {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
