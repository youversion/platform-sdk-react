import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn('yv:group/item-group yv:flex yv:flex-col', className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  'yv:group/item yv:flex yv:items-center yv:border yv:border-transparent yv:text-sm yv:rounded-md yv:transition-colors yv:[a]:hover:bg-accent/50 yv:[a]:transition-colors yv:duration-100 yv:flex-wrap yv:outline-none yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:focus-visible:ring-[3px]',
  {
    variants: {
      variant: {
        default: 'yv:bg-transparent',
      },
      size: {
        default: 'yv:p-4 yv:gap-4 yv:',
        sm: 'yv:py-3 yv:px-4 yv:gap-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Item({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof itemVariants> & { asChild?: boolean }): React.ReactNode {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  );
}

const itemMediaVariants = cva(
  'yv:flex yv:shrink-0 yv:items-center yv:justify-center yv:gap-2 yv:group-has-[[data-slot=item-description]]/item:self-start yv:[&_svg]:pointer-events-none yv:group-has-[[data-slot=item-description]]/item:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'yv:bg-transparent',
        icon: 'yv:size-8 yv:border yv:rounded-sm yv:bg-muted yv:[&_svg:not([class*=size-])]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function ItemMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>): React.ReactNode {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-slot="item-content"
      className={cn(
        'yv:flex yv:flex-1 yv:flex-col yv:gap-0 yv:[&+[data-slot=item-content]]:flex-none',
        className,
      )}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-slot="item-title"
      className={cn(
        'yv:flex yv:w-fit yv:items-center yv:gap-2 yv:text-sm yv:leading-snug yv:font-medium',
        className,
      )}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>): React.ReactNode {
  return (
    <p
      data-slot="item-description"
      className={cn(
        'yv:text-muted-foreground yv:line-clamp-2 yv:text-sm yv:leading-normal yv:font-normal yv:text-balance',
        'yv:[&>a:hover]:text-primary yv:[&>a]:underline yv:[&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  );
}

export { Item, ItemMedia, ItemContent, ItemGroup, ItemTitle, ItemDescription };
