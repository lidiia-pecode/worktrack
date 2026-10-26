"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export interface OpenedEntry<Param extends string> {
  param: Param;
  id: string;
}

/**
 * The one thing a page's side panel shows, kept in the URL as `?<param>=<id>`
 * the way the Manage pages keep `?open=`: opening from the page adds a history
 * entry, so browser Back closes the panel, and Close goes back over it; opening
 * another replaces it; a reload reopens it. Focus returns to what opened it.
 *
 * `params` lists the kinds a page can open, e.g. `["person", "project"]`; at
 * most one is in the URL at a time.
 */
export const useOpenedEntry = <Param extends string>(
  params: readonly Param[],
) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openedParam = params.find((param) => searchParams.get(param));
  const opened: OpenedEntry<Param> | null = openedParam
    ? { param: openedParam, id: searchParams.get(openedParam)! }
    : null;
  const openedKey = opened ? `${opened.param}=${opened.id}` : null;

  // The URL the panel's own history entry returns to, when it added one.
  const urlBeforeOpen = useRef<string | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  // Back or Alt+Left closes the panel without `close`, so focus returns here
  // too; otherwise it is lost with the panel.
  useEffect(() => {
    if (openedKey) return;

    urlBeforeOpen.current = null;
    if (returnFocusTo.current?.isConnected) returnFocusTo.current.focus();
    returnFocusTo.current = null;
  }, [openedKey]);

  // The names, not the array, so a caller's new array keeps the callbacks stable.
  const paramNames = params.join(",");

  const urlWith = useCallback(
    (entry: OpenedEntry<Param> | null) => {
      const next = new URLSearchParams(searchParams);

      paramNames.split(",").forEach((param) => next.delete(param));
      if (entry) next.set(entry.param, entry.id);

      return next.size ? `${pathname}?${next}` : pathname;
    },
    [pathname, searchParams, paramNames],
  );

  const open = useCallback(
    (param: Param, id: string) => {
      if (openedKey === `${param}=${id}`) return;

      returnFocusTo.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (openedKey) {
        window.history.replaceState(null, "", urlWith({ param, id }));
        return;
      }

      urlBeforeOpen.current = urlWith(null);
      window.history.pushState(null, "", urlWith({ param, id }));
    },
    [openedKey, urlWith],
  );

  // Stable until the URL changes, so an effect that closes the panel runs once
  // rather than again on every render before `back()` lands.
  const close = useCallback(() => {
    // Back only while it returns to this same view; otherwise just drop the parameter.
    if (urlBeforeOpen.current === urlWith(null)) window.history.back();
    else window.history.replaceState(null, "", urlWith(null));
    urlBeforeOpen.current = null;

    if (returnFocusTo.current?.isConnected) returnFocusTo.current.focus();
    returnFocusTo.current = null;
  }, [urlWith]);

  return { opened, open, close };
};
