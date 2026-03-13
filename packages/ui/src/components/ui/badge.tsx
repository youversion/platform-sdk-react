import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'yv:inline-flex yv:items-center yv:justify-center yv:rounded-full yv:border yv:px-2 yv:py-0.5 yv:text-xs yv:font-medium yv:w-fit yv:whitespace-nowrap yv:shrink-0 yv:[&>svg]:size-3 yv:gap-1 yv:[&>svg]:pointer-events-none yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:focus-visible:ring-[3px] yv:aria-invalid:ring-destructive/20 yv:dark:aria-invalid:ring-destructive/40 yv:aria-invalid:border-destructive yv:transition-[color,box-shadow] yv:overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'yv:border-transparent yv:bg-primary yv:text-primary-foreground yv:[a&]:hover:bg-primary/90',
        secondary:
          'yv:border-transparent yv:bg-muted yv:text-muted-foreground yv:[a&]:hover:bg-muted/90',
        destructive:
          'yv:border-transparent yv:bg-destructive yv:text-white yv:[a&]:hover:bg-destructive/90 yv:focus-visible:ring-destructive/20 yv:dark:focus-visible:ring-destructive/40 yv:dark:bg-destructive/60',
        outline: 'yv:text-foreground yv:[a&]:hover:bg-accent yv:[a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }): React.ReactNode {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
