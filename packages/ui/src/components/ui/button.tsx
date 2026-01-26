import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'yv:select-none yv:cursor-pointer yv:inline-flex yv:items-center yv:justify-center yv:gap-2 yv:whitespace-nowrap yv:rounded-md yv:text-sm yv:font-medium yv:transition-all yv:disabled:pointer-events-none yv:disabled:opacity-50 yv:[&_svg]:pointer-events-none yv:[&_svg:not([class*=size-])]:size-6 yv:shrink-0 yv:[&_svg]:shrink-0 yv:outline-none yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:focus-visible:ring-[3px] yv:aria-invalid:ring-destructive/20 yv:dark:aria-invalid:ring-destructive/40 yv:aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default: 'yv:bg-background yv:text-primary-foreground yv:hover:bg-background/90',
        destructive:
          'yv:bg-destructive yv:text-white yv:hover:bg-destructive/90 yv:focus-visible:ring-destructive/20 yv:dark:focus-visible:ring-destructive/40 yv:dark:bg-destructive/60',
        outline:
          'yv:border yv:border-border yv:bg-background yv:shadow-xs yv:hover:bg-accent yv:hover:text-accent-foreground yv:dark:bg-input/30 yv:dark:border-input yv:dark:hover:bg-input/50',
        secondary: 'yv:bg-muted yv:text-muted-foreground yv:hover:bg-muted/80',
        ghost: 'yv:hover:bg-accent yv:hover:text-accent-foreground yv:dark:hover:bg-accent/50',
        link: 'yv:text-primary yv:underline-offset-4 yv:hover:underline',
      },
      size: {
        default: 'yv:h-9 yv:px-4 yv:py-2 yv:has-[>svg]:px-3',
        sm: 'yv:h-8 yv:rounded-md yv:gap-1.5 yv:px-3 yv:has-[>svg]:px-2.5',
        lg: 'yv:h-10 yv:rounded-md yv:px-6 yv:has-[>svg]:px-4',
        icon: 'yv:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps): React.ReactElement {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
