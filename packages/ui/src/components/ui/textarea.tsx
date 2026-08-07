import * as React from 'react';
import { useTheme } from '@youversion/platform-react-hooks';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.ReactElement {
  const theme = useTheme();

  return (
    <textarea
      data-slot="textarea"
      // Textarea is exported from the package root, so it can be the outermost
      // SDK element on the page. It carries the gate attribute itself, and does
      // not depend on an SDK ancestor. `{...props}` stays last, so a caller
      // inside a scope with another theme can override `data-yv-theme`.
      data-yv-sdk=""
      data-yv-theme={theme}
      className={cn(
        'yv:border-input yv:placeholder:text-muted-foreground yv:focus-visible:border-ring yv:focus-visible:ring-ring/50 yv:aria-invalid:ring-destructive/20 yv:dark:aria-invalid:ring-destructive/40 yv:aria-invalid:border-destructive yv:dark:bg-input/30 yv:flex yv:field-sizing-content yv:min-h-16 yv:w-full yv:rounded-md yv:border yv:bg-transparent yv:px-3 yv:py-2 yv:text-base yv:shadow-xs yv:transition-[color,box-shadow] yv:outline-none yv:focus-visible:ring-[3px] yv:disabled:cursor-not-allowed yv:disabled:opacity-50 yv:md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
