import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'yv:group/input-group yv:border-input yv:dark:bg-input/30 yv:relative yv:flex yv:w-full yv:items-center yv:rounded-md yv:border yv:shadow-xs yv:transition-[color,box-shadow] yv:outline-none',
        'yv:h-9 yv:min-w-0 yv:has-[>textarea]:h-auto',
        'yv:has-[>[data-align=inline-start]]:[&>input]:pl-2',
        'yv:has-[[data-slot=input-group-control]:focus-visible]:border-ring yv:has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 yv:has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',
        'yv:has-[[data-slot][aria-invalid=true]]:ring-destructive/20 yv:has-[[data-slot][aria-invalid=true]]:border-destructive yv:dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align="inline-start"
      className={cn(
        'yv:text-muted-foreground yv:flex yv:h-auto yv:cursor-text yv:items-center yv:justify-center yv:gap-2 yv:py-1.5 yv:text-sm yv:font-medium yv:select-none yv:[&>svg:not([class*=size-])]:size-4 yv:[&>kbd]:rounded-[calc(var(--radius)-5px)] yv:group-data-[disabled=true]/input-group:opacity-50',
        'yv:order-first yv:pl-3 yv:has-[>button]:ml-[-0.45rem] yv:has-[>kbd]:ml-[-0.35rem]',
        className,
      )}
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>): React.ReactElement {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'yv:flex-1 yv:rounded-none yv:border-0 yv:bg-transparent yv:shadow-none yv:focus-visible:ring-0 yv:dark:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
