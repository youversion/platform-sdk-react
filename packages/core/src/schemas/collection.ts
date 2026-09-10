/**
 * Generic Collection type for paginated responses
 */
export type Collection<T> = Readonly<{
  data: T[];
  next_page_token: string | null;
  total_size?: number;
}>;
