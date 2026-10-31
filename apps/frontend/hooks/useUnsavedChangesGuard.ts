"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

/** Where a click on an in-app link would go, or null for one the guard leaves alone. */
const inAppDestination = (event: MouseEvent) => {
  if (!isPlainClick(event) || !(event.target instanceof Element)) return null;

  const link = event.target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target === "_blank" || link.hasAttribute("download")) return null;

  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname) return null;

  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * Asks before unsaved edits are dropped by leaving the page. A reload or a
 * closed tab gets the browser's own prompt. The App Router has no event for a
 * route change, so a plain click on an in-app link is stopped before Next
 * handles it and kept as `pendingHref` for the page's discard dialog; a click
 * that opens a new tab, and a link to another site (which the browser prompt
 * covers), are left alone.
 */
export const useUnsavedChangesGuard = (isDirty: boolean) => {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const askBeforeUnload = (event: BeforeUnloadEvent) =>
      event.preventDefault();

    // Capture phase on the document, so it runs before React's handlers on the
    // root, Next's `<Link>` among them.
    const stopLeavingLink = (event: MouseEvent) => {
      const href = inAppDestination(event);
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };

    window.addEventListener("beforeunload", askBeforeUnload);
    document.addEventListener("click", stopLeavingLink, true);

    return () => {
      window.removeEventListener("beforeunload", askBeforeUnload);
      document.removeEventListener("click", stopLeavingLink, true);
    };
  }, [isDirty]);

  const discardAndLeave = () => {
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  };

  return {
    pendingHref,
    discardAndLeave,
    keepEditing: () => setPendingHref(null),
  };
};
