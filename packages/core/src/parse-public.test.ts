import { expect, it } from 'vitest';
import { ZodError } from 'zod';
import * as z from 'zod/mini';
import { parsePublic } from './parse-public';

const PositiveIntSchema = z.int().check(z.positive());

it('wraps Mini $ZodError so partners can still catch instanceof ZodError', () => {
  try {
    PositiveIntSchema.parse(-1);
    throw new Error('expected Mini parse to fail');
  } catch (cause) {
    expect(cause).toBeInstanceOf(z.core.$ZodError);
    expect(cause instanceof ZodError).toBe(false);
  }

  try {
    parsePublic(PositiveIntSchema, -1);
    throw new Error('expected public parse to fail');
  } catch (cause) {
    expect(cause).toBeInstanceOf(ZodError);
    expect(cause).toBeInstanceOf(Error);
  }
});
