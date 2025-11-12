import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const buttonGroupVariants = cva(
  'yv:flex yv:w-fit yv:items-stretch yv:[&>*]:focus-visible:z-10 yv:[&>*]:focus-visible:relative yv:[&>[data-slot=select-trigger]:not([class*=w-])]:w-fit yv:[&>input]:flex-1 yv:has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md yv:has-[>[data-slot=button-group]]:gap-2',
  {
    variants: {
      orientation: {
        horizontal:
          'yv:[&>*:not(:first-child)]:rounded-l-none yv:[&>*:not(:first-child)]:border-l-0 yv:[&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'yv:flex-col yv:[&>*:not(:first-child)]:rounded-t-none yv:[&>*:not(:first-child)]:border-t-0 yv:[&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>): React.ReactNode {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & {
  asChild?: boolean;
}): React.ReactNode {
  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      className={cn(
        'yv:bg-muted yv:flex yv:items-center yv:gap-2 yv:rounded-md yv:border yv:px-4 yv:text-sm yv:font-medium yv:shadow-xs yv:[&_svg]:pointer-events-none yv:[&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>): React.ReactNode {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        'yv:bg-input yv:relative yv:!m-0 yv:self-stretch yv:data-[orientation=vertical]:h-auto',
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
