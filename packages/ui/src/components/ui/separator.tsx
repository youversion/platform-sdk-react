import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { useTheme } from '@youversion/platform-react-hooks';

import { cn } from '@/lib/utils';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>): React.ReactNode {
  const theme = useTheme();

  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      // Separator is exported from the package root, so it can be the outermost
      // SDK element on the page. It carries the scope attribute itself rather
      // than relying on an SDK ancestor. `{...props}` stays last so a caller
      // inside a differently-themed scope can override `data-yv-theme`.
      data-yv-sdk=""
      data-yv-theme={theme}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'yv:bg-border yv:shrink-0 yv:data-[orientation=horizontal]:h-px yv:data-[orientation=horizontal]:w-full yv:data-[orientation=vertical]:h-full yv:data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
