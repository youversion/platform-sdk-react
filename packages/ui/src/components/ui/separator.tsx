import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@/lib/utils';
import { YvComponentStyles } from '@/lib/yv-styles-components';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>): React.ReactNode {
  return (
    <>
      <YvComponentStyles />
      <SeparatorPrimitive.Root
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
}

export { Separator };
