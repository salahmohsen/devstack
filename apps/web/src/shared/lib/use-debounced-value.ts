import { useEffect, useState } from "react";

export function useDebouncedValue<T>(
  value: T,
  delayMs: number
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return [debounced, setDebounced] as const;
}
