"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const PERSON_PARAM = "person";

/**
 * The person whose week the Team time panel shows, kept in `?person=<id>` the
 * way the Manage pages keep `?open=`: opening from the grid adds a history
 * entry, so browser Back closes the panel, and Close goes back over it; a
 * reload reopens the same person. Focus returns to the row that opened it.
 */
export const useOpenedPerson = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const personId = searchParams.get(PERSON_PARAM);

  // The URL the panel's own history entry returns to, when it added one.
  const urlBeforeOpen = useRef<string | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!personId) urlBeforeOpen.current = null;
  }, [personId]);

  const urlWithPerson = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams);

      if (id) params.set(PERSON_PARAM, id);
      else params.delete(PERSON_PARAM);

      return params.size ? `${pathname}?${params}` : pathname;
    },
    [pathname, searchParams],
  );

  const open = useCallback(
    (id: string) => {
      if (id === personId) return;

      returnFocusTo.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (personId) {
        window.history.replaceState(null, "", urlWithPerson(id));
        return;
      }

      urlBeforeOpen.current = urlWithPerson(null);
      window.history.pushState(null, "", urlWithPerson(id));
    },
    [personId, urlWithPerson],
  );

  // Stable until the URL changes, so an effect that closes the panel runs once
  // rather than again on every render before `back()` lands.
  const close = useCallback(() => {
    // Back only while it returns to this same view; otherwise just drop the parameter.
    if (urlBeforeOpen.current === urlWithPerson(null)) window.history.back();
    else window.history.replaceState(null, "", urlWithPerson(null));
    urlBeforeOpen.current = null;

    if (returnFocusTo.current?.isConnected) returnFocusTo.current.focus();
    returnFocusTo.current = null;
  }, [urlWithPerson]);

  return { personId, open, close };
};
