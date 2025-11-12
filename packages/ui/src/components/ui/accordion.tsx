import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>): React.ReactNode {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentProps<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    data-slot="accordion-item"
    className={cn('yv:border-b yv:last:border-b-0', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>): React.ReactNode {
  return (
    <AccordionPrimitive.Header className="yv:flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:flex yv:flex-1 yv:items-start yv:justify-between yv:gap-4 yv:rounded-md yv:py-4 yv:text-left yv:text-sm yv:font-medium yv:transition-all yv:outline-none yv:focus-visible:ring-[3px] yv:disabled:pointer-events-none yv:disabled:opacity-50 yv:[&[data-state=open]>svg]:rotate-180 yv:cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="yv:text-muted-foreground yv:size-4 yv:shrink-0 yv:translate-y-0.5 yv:transition-transform yv:duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>): React.ReactNode {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="yv:data-[state=closed]:animate-accordion-up yv:data-[state=open]:animate-accordion-down yv:overflow-hidden yv:text-sm"
      {...props}
    >
      <div className={cn('yv:pt-0 yv:pb-4', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
