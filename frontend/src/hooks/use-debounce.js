import { useState, useEffect } from "react";

const DEFAULT_DELAY = 300;

export function useDebounce(value, delay = DEFAULT_DELAY) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
