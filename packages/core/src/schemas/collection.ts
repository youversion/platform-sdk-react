import { z } from 'zod';

/**
 * Generic Collection schema for paginated responses
 * Used across multiple API endpoints
 * Based on official YouVersion API schema
 */
const _CollectionSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{
  data: z.ZodArray<T>;
  next_page_token: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  total_size: z.ZodOptional<z.ZodNumber>;
}> =>
  z.object({
    data: z.array(itemSchema),
    next_page_token: z.string().nullable().optional(), // Real API sometimes returns undefined
    total_size: z.number().int().optional(), // Used by Languages endpoint
  });

/**
 * Generic Collection type for paginated responses
 */
export type Collection<T> = Readonly<{
  data: T[];
  next_page_token: string | null;
  total_size?: number;
}>;
