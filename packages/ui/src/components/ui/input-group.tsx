import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'yv:group/input-group yv:border-input yv:dark:bg-input/30 yv:relative yv:flex yv:w-full yv:items-center yv:rounded-md yv:border yv:shadow-xs yv:transition-[color,box-shadow] yv:outline-none',
        'yv:h-9 yv:min-w-0 yv:has-[>textarea]:h-auto',

        // Variants based on alignment.
        'yv:has-[>[data-align=inline-start]]:[&>input]:pl-2',
        'yv:has-[>[data-align=inline-end]]:[&>input]:pr-2',
        'yv:has-[>[data-align=block-start]]:h-auto yv:has-[>[data-align=block-start]]:flex-col yv:has-[>[data-align=block-start]]:[&>input]:pb-3',
        'yv:has-[>[data-align=block-end]]:h-auto yv:has-[>[data-align=block-end]]:flex-col yv:has-[>[data-align=block-end]]:[&>input]:pt-3',

        // Focus state.
        'yv:has-[[data-slot=input-group-control]:focus-visible]:border-ring yv:has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 yv:has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',

        // Error state.
        'yv:has-[[data-slot][aria-invalid=true]]:ring-destructive/20 yv:has-[[data-slot][aria-invalid=true]]:border-destructive yv:dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',

        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  'yv:text-muted-foreground yv:flex yv:h-auto yv:cursor-text yv:items-center yv:justify-center yv:gap-2 yv:py-1.5 yv:text-sm yv:font-medium yv:select-none yv:[&>svg:not([class*=size-])]:size-4 yv:[&>kbd]:rounded-[calc(var(--radius)-5px)] yv:group-data-[disabled=true]/input-group:opacity-50',
  {
    variants: {
      align: {
        'inline-start':
          'yv:order-first yv:pl-3 yv:has-[>button]:ml-[-0.45rem] yv:has-[>kbd]:ml-[-0.35rem]',
        'inline-end':
          'yv:order-last yv:pr-3 yv:has-[>button]:mr-[-0.45rem] yv:has-[>kbd]:mr-[-0.35rem]',
        'block-start':
          'yv:order-first yv:w-full yv:justify-start yv:px-3 yv:pt-3 yv:[.border-b]:pb-3 yv:group-has-[>input]/input-group:pt-2.5',
        'block-end':
          'yv:order-last yv:w-full yv:justify-start yv:px-3 yv:pb-3 yv:[.border-t]:pt-3 yv:group-has-[>input]/input-group:pb-2.5',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>): React.ReactElement {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva('yv:text-sm yv:shadow-none yv:flex yv:gap-2 yv:items-center', {
  variants: {
    size: {
      xs: 'yv:h-6 yv:gap-1 yv:px-2 yv:rounded-[calc(var(--radius)-5px)] yv:[&>svg:not([class*=size-])]:size-3.5 yv:has-[>svg]:px-2',
      sm: 'yv:h-8 yv:px-2.5 yv:gap-1.5 yv:rounded-md yv:has-[>svg]:px-2.5',
      'icon-xs': 'yv:size-6 yv:rounded-[calc(var(--radius)-5px)] yv:p-0 yv:has-[>svg]:p-0',
      'icon-sm': 'yv:size-8 yv:p-0 yv:has-[>svg]:p-0',
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> &
  VariantProps<typeof inputGroupButtonVariants>): React.ReactElement {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>): React.ReactElement {
  return (
    <span
      className={cn(
        'yv:text-muted-foreground yv:flex yv:items-center yv:gap-2 yv:text-sm yv:[&_svg]:pointer-events-none yv:[&_svg:not([class*=size-])]:size-4',
        className,
      )}
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

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>): React.ReactElement {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'yv:flex-1 yv:resize-none yv:rounded-none yv:border-0 yv:bg-transparent yv:py-3 yv:shadow-none yv:focus-visible:ring-0 yv:dark:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
