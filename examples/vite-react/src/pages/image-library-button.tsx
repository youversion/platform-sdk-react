import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function ImageLibraryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        'h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50',
        className,
      )}
    />
  );
}
