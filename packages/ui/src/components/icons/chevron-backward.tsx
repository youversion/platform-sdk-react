import type { ComponentProps, ReactElement } from 'react';
import { useInterfaceDirection } from '@/lib/direction';
import { ChevronLeftIcon } from './chevron-left';
import { ChevronRightIcon } from './chevron-right';

export function ChevronBackwardIcon(props: ComponentProps<'svg'>): ReactElement {
  return useInterfaceDirection() === 'rtl' ? (
    <ChevronRightIcon {...props} />
  ) : (
    <ChevronLeftIcon {...props} />
  );
}
