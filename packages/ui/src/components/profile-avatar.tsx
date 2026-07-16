import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface ProfileAvatarProps extends React.ComponentProps<typeof Avatar> {
  /** Full display name; initials are used as the fallback. */
  name?: string | null;
  /** Profile image URL. Fallback renders while loading or on error. */
  src?: string | null;
}

/** "Cam Anderson" → "CA", "Cher" → "C". Names always include first (and usually last). */
function getInitials(name?: string | null): string {
  const words = name?.trim().split(/\s+/) ?? [];
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Profile avatar: shows the user's image when available, otherwise their
 * initials ("CA" or "C") inside a bordered circle (YPE-3648).
 */
export function ProfileAvatar({
  name,
  src,
  className,
  ...props
}: ProfileAvatarProps): React.ReactNode {
  const initial = getInitials(name);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  return (
    <Avatar
      aria-label={name?.trim() || undefined}
      className={cn(src && imageLoaded && 'yv:bg-(--yv-gray-10) yv:p-[3px]', className)}
      {...props}
    >
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          className="yv:rounded-full"
          onLoadingStatusChange={(status) => setImageLoaded(status === 'loaded')}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          'yv:border-2 yv:border-foreground yv:bg-background yv:font-sans yv:text-xs yv:font-bold yv:text-foreground',
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
