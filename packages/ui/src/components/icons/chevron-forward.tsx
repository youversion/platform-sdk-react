import type { ComponentProps, ReactElement } from 'react';
import { useInterfaceDirection } from '@/lib/direction';
import { ChevronLeftIcon } from './chevron-left';
import { ChevronRightIcon } from './chevron-right';

export function ChevronForwardIcon(props: ComponentProps<'svg'>): ReactElement {
  return useInterfaceDirection() === 'rtl' ? (
    <ChevronLeftIcon {...props} />
  ) : (
    <ChevronRightIcon {...props} />
  );
}
