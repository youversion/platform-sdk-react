import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@/lib/utils';
import { withShadowIsolation } from '@/lib/shadow-isolation';
import { YvComponentStyles } from '@/lib/yv-styles-components';

const SeparatorImplementation = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
  return (
    <>
      <YvComponentStyles />
      <SeparatorPrimitive.Root
        ref={ref}
        data-slot="separator"
        decorative={decorative}
        orientation={orientation}
        className={cn(
          'yv:bg-border yv:shrink-0 yv:data-[orientation=horizontal]:h-px yv:data-[orientation=horizontal]:w-full yv:data-[orientation=vertical]:h-full yv:data-[orientation=vertical]:w-px',
          className,
        )}
        {...props}
      />
    </>
  );
});
SeparatorImplementation.displayName = 'SeparatorImplementation';

const Separator = withShadowIsolation(SeparatorImplementation, 'Separator');

export { Separator };
