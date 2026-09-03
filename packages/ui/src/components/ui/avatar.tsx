import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '@/lib/utils';

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>): React.ReactNode {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'yv:relative yv:flex yv:size-8 yv:shrink-0 yv:overflow-hidden yv:rounded-full yv:select-none',
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>): React.ReactNode {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('yv:aspect-square yv:size-full yv:object-cover', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>): React.ReactNode {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'yv:flex yv:size-full yv:items-center yv:justify-center yv:rounded-full',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
