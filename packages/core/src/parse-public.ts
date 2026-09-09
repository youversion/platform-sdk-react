import * as z from 'zod/mini';

type PublicSchema<Input, Output> = {
  parse(data: Input): Output;
};

/**
 * Classic `ZodError` identity without importing `zod` (that entry loads locale
 * files). Zod 4 `instanceof ZodError` is trait-based: `_zod.traits` has
 * `"ZodError"`. Mini parse throws `$ZodError`; wrapping here restores the
 * public constructor partners already catch.
 */
const ClassicZodError = z.core.$constructor(
  'ZodError',
  (inst: z.core.$ZodError, issues: z.core.$ZodIssue[]) => {
    z.core.$ZodError.init(inst, issues);
    inst.name = 'ZodError';
  },
  { Parent: Error },
);

function throwAsClassicZodError(cause: unknown): never {
  if (cause instanceof z.core.$ZodError) {
    throw new ClassicZodError(cause.issues);
  }
  throw cause;
}

/** Parse at a public client boundary, rethrowing Mini failures as classic ZodError. */
export function parsePublic<Input, Output>(
  schema: PublicSchema<Input, Output>,
  data: Input,
): Output {
  try {
    return schema.parse(data);
  } catch (cause) {
    throwAsClassicZodError(cause);
  }
}
