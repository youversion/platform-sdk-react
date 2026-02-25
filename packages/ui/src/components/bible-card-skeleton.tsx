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
        <Skeleton className="yv:h-8 yv:w-52" />
        {showVersionPicker ? <Skeleton className="yv:h-12 yv:w-24 yv:rounded-full" /> : null}
      </div>

      <div className="yv:mt-10">
        <Skeleton className="yv:h-32 yv:w-full" />
      </div>

      <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-4 yv:items-center yv:mt-10">
        <Skeleton className="yv:h-14 yv:w-64" />
        <div className="yv:justify-self-end">
          <BibleAppLogoLockup fontSize={12} />
        </div>
      </div>
    </section>
  );
}
