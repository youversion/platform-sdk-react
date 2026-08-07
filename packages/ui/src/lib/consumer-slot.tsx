import type { ReactElement, ReactNode } from 'react';

/**
 * Marks a piece of DOM as consumer territory, so SDK CSS stops there.
 *
 * The SDK sheet is gated on `[data-yv-sdk]`, and the gate's descendant arm used
 * to be `[data-yv-sdk] *`. That arm matched everything inside an SDK subtree,
 * including the `children` a consumer passed into an SDK component. The
 * consumer's own markup was being reset and recolored by our sheet, and after
 * the layered-`!important` change those declarations were important too.
 *
 * The gate arm is now
 * `[data-yv-sdk] *:not([data-yv-slot], [data-yv-slot] *)`. Wrapping consumer
 * content in this component puts `data-yv-slot` on the boundary, and no SDK
 * selector matches the wrapper or anything under it.
 *
 * Two things this does not do, both on purpose:
 *
 * - It does not stop inheritance. `color`, `font-family` and the rest still flow
 *   in from the SDK ancestors, the way any content inherits from where it is
 *   placed. A consumer who wants different values declares them. The reverse
 *   harness measures selector matching only, for that reason.
 * - It does not stop a selector whose subject sits past the gate compound, such
 *   as a `space-y-*` utility's `> :not(:last-child)`. Such a selector can reach
 *   this wrapper, though not the consumer elements below it. See
 *   docs/style-isolation-residual-leak.md.
 *
 * `display: contents` keeps the wrapper out of layout, so stamping a slot never
 * changes how the content is laid out.
 *
 * See docs/adr/0008-stop-sdk-css-at-consumer-slots.md.
 */
export function ConsumerSlot({ children }: { children: ReactNode }): ReactElement {
  return (
    <span data-yv-slot style={{ display: 'contents' }}>
      {children}
    </span>
  );
}
