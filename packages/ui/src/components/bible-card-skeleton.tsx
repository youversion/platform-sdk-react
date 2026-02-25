import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { Skeleton } from './ui/skeleton';

type BibleCardSkeletonProps = {
  showVersionPicker?: boolean;
  background?: 'light' | 'dark';
};

export function BibleCardSkeleton({
  showVersionPicker = false,
  background = 'light',
}: BibleCardSkeletonProps): React.ReactElement {
  return (
    <section
      data-yv-sdk
      data-yv-theme={background}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Bible verse"
      className="yv:flex yv:flex-col yv:bg-card yv:p-6 yv:max-w-md yv:rounded-2xl"
    >
      <span className="yv:sr-only">Loading Bible verse</span>

      <div className="yv:flex yv:justify-between yv:items-center">
        <Skeleton className="yv:h-6 yv:w-24 yv:rounded-[5px]" />
        {showVersionPicker ? <Skeleton className="yv:h-10 yv:w-18 yv:rounded-full" /> : null}
      </div>

      <div className="yv:mt-10">
        <Skeleton className="yv:h-32 yv:w-full yv:rounded-[5px]" />
      </div>

      <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-4 yv:items-center yv:mt-10">
        <div className="yv:space-y-2 yv:w-64 yv:flex yv:flex-col yv:gap-2 yv:rounded-sm">
          <Skeleton className="yv:h-4 yv:w-full yv:rounded-[5px]" />
          <Skeleton className="yv:h-4 yv:w-40 yv:rounded-[5px]" />
        </div>
        <div className="yv:justify-self-end">
          <BibleAppLogoLockup fontSize={12} />
        </div>
      </div>
    </section>
  );
}
