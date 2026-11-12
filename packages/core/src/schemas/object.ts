import * as z from 'zod/mini';

/**
 * `z.object` with the return type zod used before 4.6. Since 4.6, `z.object`
 * returns `ZodMiniObject<Writeable<T>>`, and tsc drops field doc comments when
 * it writes that mapped type to `.d.ts` files, so consumers lose IDE hover docs.
 * Build object schemas with this instead of `z.object`.
 */
export const object =
  // SAFETY: this is the same function. `Writeable<T>` only removes `readonly`
  // from field keys. For an ordinary field object, it equals `T`. A field
  // object written with `as const` keeps its `readonly` keys here, so parsed
  // values are typed readonly while zod returns mutable objects. That only
  // restricts callers, and no schema in core does it today.
  z.object as <T extends Record<string, z.core.$ZodType>>(
    fields: T,
    params?: string | z.core.$ZodObjectParams,
  ) => z.ZodMiniObject<T, z.core.$strip>;
