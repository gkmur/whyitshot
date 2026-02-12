import { useEffect, useRef } from "react";

export function useAutosave<T>(data: T, saveFn: (data: T) => boolean | void, delay = 500) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(data);
  const isFirstRender = useRef(true);

  useEffect(() => {
    latestRef.current = data;
  }, [data]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveFn(latestRef.current);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      saveFn(latestRef.current);
    };
  }, [data, saveFn, delay]);
}
