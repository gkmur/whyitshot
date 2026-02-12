import { useEffect, useRef } from "react";
import { type SKU } from "@/types/sku";
import { saveSession } from "./storage";

export function useAutosave(skus: SKU[], delay = 500) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(skus);
  const isFirstRender = useRef(true);

  useEffect(() => {
    latestRef.current = skus;
  }, [skus]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveSession(latestRef.current);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      saveSession(latestRef.current);
    };
  }, [skus, delay]);
}
