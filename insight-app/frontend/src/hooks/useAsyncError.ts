import { useState, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAsyncError<T extends (...args: any[]) => Promise<any>>(fn: T) {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* useCallback stabilizes the handler reference so callers don't re-render
     on every render of the component that owns this hook */
  const handler = useCallback(
    async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
      try {
        setError(null);
        setIsLoading(true);
        return await fn(...args);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [fn],
  );

  return { handler, error, isLoading, clearError: () => setError(null) };
}
