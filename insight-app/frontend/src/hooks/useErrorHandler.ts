import { useState, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useErrorHandler<T extends (...args: any[]) => any>(fn: T) {
  const [error, setError] = useState<Error | null>(null);

  /* useCallback stabilizes the handler reference so callers don't re-render
     on every render of the component that owns this hook */
  const handler = useCallback(
    (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        setError(null);
        return fn(...args);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return undefined;
      }
    },
    [fn],
  );

  return { handler, error, clearError: () => setError(null) };
}
