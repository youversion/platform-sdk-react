export type UseQueryResult<TData> = {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

export type UseNamedQueryResult<TName extends string, TData> = Record<TName, TData | null> & {
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};
