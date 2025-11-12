import { useEffect, useState } from 'react';

/**
 * Custom hook for debouncing a value.
 *
 * The hook delays the update of the given value until a specified delay has passed
 * after the last change. It is commonly used to optimize the performance of
 * functions that depend on user input or rapidly updating values.
 *
 * @param value - The input value to be debounced.
 * @param delay - The duration in milliseconds to delay the update of the value.
 *
 * @returns The debounced value, updated after the specified delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
