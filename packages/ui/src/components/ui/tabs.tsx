import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>): React.ReactElement {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('yv:flex yv:flex-col yv:gap-2', className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>): React.ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'yv:bg-muted yv:text-muted-foreground yv:inline-flex yv:h-9 yv:w-fit yv:items-center yv:justify-center yv:rounded-[8px] yv:p-0.5',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): React.ReactElement {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'yv:data-[state=active]:bg-background yv:dark:data-[state=active]:text-foreground yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:focus-visible:outline-ring yv:dark:data-[state=active]:border-input yv:text-foreground yv:dark:text-muted-foreground yv:inline-flex yv:h-[calc(100%-1px)] yv:flex-1 yv:items-center yv:justify-center yv:gap-1.5 yv:rounded-[8px] yv:border yv:border-transparent yv:px-2 yv:py-1 yv:text-xs yv:font-medium yv:data-[state=active]:font-bold yv:whitespace-nowrap yv:transition-[color,box-shadow] yv:focus-visible:ring-[3px] yv:focus-visible:outline-1 yv:disabled:pointer-events-none yv:disabled:opacity-50 yv:data-[state=active]:shadow-sm yv:[&_svg]:pointer-events-none yv:[&_svg]:shrink-0 yv:[&_svg:not([class*=size-])]:size-4 yv:cursor-pointer',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>): React.ReactElement {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('yv:flex-1 yv:outline-none yv:overflow-y-auto', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
