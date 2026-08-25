import { stylexStylesheet } from '../lib/embedded-styles';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { BibleCardStyleX } from './bible-card-stylex';
import { BibleCardTailwind } from './bible-card-tailwind';
import type { BibleCardProps } from './bible-card-model';

export type { BibleCardProps } from './bible-card-model';

/**
 * BibleCard. The measured StyleX spike is the default path (picker off):
 * Austin's existing shadow host adopts a StyleX-only sheet. The picker-on
 * path stays on the shared Tailwind Button / popover stack for YPE-5138.
 */
export function BibleCard(props: BibleCardProps): React.ReactNode {
  if (props.showVersionPicker) {
    return <BibleCardTailwind {...props} />;
  }

  return (
    <ShadowRootHost cssText={stylexStylesheet}>
      <BibleCardStyleX {...props} />
    </ShadowRootHost>
  );
}
