import { useCallback, type ReactElement } from 'react';
import { useShadowStylesProvided } from './shadow-root-host';
import { ensureBaseFonts, YvBaseFonts } from './yv-fonts';

declare const __YV_COMPONENT_STYLES__: string;

/**
 * Utilities for scripture, pickers, auth, and popovers. Not on Provider-only.
 *
 * React 19 hoists this style into `<head>` and de-duplicates repeated light-DOM
 * renders by `href`. Automatic shadow roots already provide this sheet.
 */
export function YvComponentStyles(): ReactElement | null {
  const [probeRef, stylesProvided] = useShadowStylesProvided();
  const scopedProbeRef = useCallback(
    (probe: HTMLTemplateElement | null) => {
      if (probe) ensureBaseFonts(probe.ownerDocument);
      probeRef(probe);
    },
    [probeRef],
  );
  if (stylesProvided === null) {
    return <template ref={scopedProbeRef} />;
  }

  return (
    <>
      {stylesProvided ? null : <YvBaseFonts />}
      {stylesProvided ? null : (
        <style href="yv-sdk-components" precedence="yv-sdk">
          {__YV_COMPONENT_STYLES__}
        </style>
      )}
    </>
  );
}
