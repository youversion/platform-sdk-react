import { BookOpen, Images, LayoutGrid, User, type LucideIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { destinations, formatHash, rootRoute, type AppRoute, type Destination } from '@/routes';

function destinationIcon(destination: Destination): LucideIcon {
  switch (destination) {
    case 'bible':
      return BookOpen;
    case 'content':
      return Images;
    case 'examples':
      return LayoutGrid;
    case 'profile':
      return User;
    default: {
      const unreachable: never = destination;
      return unreachable;
    }
  }
}

export function DestinationNav({ route }: { route: AppRoute }) {
  return (
    <header className="shrink-0 border-b bg-background/95 backdrop-blur">
      <nav aria-label="Primary" className="flex items-center justify-center gap-1 ps-2 pe-2 py-2">
        {destinations.map((destination) => {
          const active = route.destination === destination.id;
          const Icon = destinationIcon(destination.id);
          return (
            <a
              key={destination.id}
              href={formatHash(rootRoute(destination.id))}
              aria-current={active ? 'page' : undefined}
              className={cn(
                buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'sm' }),
                'border-b-2',
                active ? 'border-primary' : 'border-transparent',
              )}
            >
              <Icon className="size-5 md:hidden" aria-hidden="true" />
              <span className="max-md:sr-only">{destination.label}</span>
            </a>
          );
        })}
      </nav>
    </header>
  );
}
