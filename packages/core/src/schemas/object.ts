import * as z from 'zod/mini';

/**
 * `z.object` with the return type zod used before 4.6. Since 4.6, `z.object`
 * returns `ZodMiniObject<Writeable<T>>`, and tsc drops field doc comments when
 * it writes that mapped type to `.d.ts` files, so consumers lose IDE hover docs.
 * Build object schemas with this instead of `z.object`.
 */
export const object =
  // SAFETY: this is the same function. `Writeable<T>` only removes `readonly`
  // from field keys, and the field objects passed here are never readonly, so
  // it equals `T`.
  z.object as <T extends Record<string, z.core.$ZodType>>(
    fields: T,
    params?: string | z.core.$ZodObjectParams,
  ) => z.ZodMiniObject<T, z.core.$strip>;
