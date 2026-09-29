"use client";

import { useCallback, useSyncExternalStore } from "react";

const DISMISSED = "dismissed";

const listeners = new Set<() => void>();

// Keeps a dismissal for this visit when the browser refuses storage.
const dismissedThisVisit = new Set<string>();

const isStoredAsDismissed = (key: string) => {
  try {
    return window.localStorage.getItem(key) === DISMISSED;
  } catch {
    return false;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

/**
 * Remembers in this browser that something was dismissed. The server renders it
 * as dismissed, so it never flashes before the browser's answer is known.
 */
export const useDismissible = (key: string) => {
  const isDismissed = useSyncExternalStore(
    subscribe,
    () => dismissedThisVisit.has(key) || isStoredAsDismissed(key),
    () => true,
  );

  const dismiss = useCallback(() => {
    dismissedThisVisit.add(key);

    try {
      window.localStorage.setItem(key, DISMISSED);
    } catch {
      // Storage is blocked; the dismissal lasts for this visit only.
    }

    listeners.forEach((listener) => listener());
  }, [key]);

  return { isDismissed, dismiss };
};
