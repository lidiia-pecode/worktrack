"use client";

import {
  KeyboardEvent,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { Dialog, DialogSidePanel } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// From `xl` the page keeps enough room beside the panel; below it the panel is a drawer over the page.
const DESKTOP_MEDIA_QUERY = "(min-width: 80rem)";

interface SidePanelProps {
  /** The id of the heading inside the panel, which labels it. */
  titleId: string;
  onClose: () => void;
  /** Focus moves to the panel whenever this changes, such as for each new entity. */
  focusKey: string;
  /** The `aside` on desktop; null while the panel is a drawer. */
  ref?: Ref<HTMLElement>;
  children: ReactNode;
}

/**
 * The right-hand panel a page opens beside itself: an `aside` from `xl`, where
 * `<main>` makes room for it (`has-[[data-side-panel]]`), and a
 * `DialogSidePanel` below that. The content brings its own header and heading.
 */
export const SidePanel = ({
  titleId,
  onClose,
  focusKey,
  ref,
  children,
}: SidePanelProps) => {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const asideRef = useRef<HTMLElement>(null);

  const setAside = useCallback(
    (aside: HTMLElement | null) => {
      asideRef.current = aside;
      if (typeof ref === "function") ref(aside);
      else if (ref) ref.current = aside;
    },
    [ref],
  );

  // Focus the heading for each new content, also once the media query resolves after a reload.
  useEffect(() => {
    asideRef.current?.focus();
  }, [focusKey, isDesktop]);

  if (isDesktop) {
    // Dialogs opened from the panel are portalled out of it; their Escape is theirs.
    const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
      if (
        event.key === "Escape" &&
        asideRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // On a screen wider than the app, it stays at the app's right edge.
    return (
      <aside
        ref={setAside}
        data-side-panel
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={closeOnEscape}
        className="fixed inset-y-0 right-0 z-30 flex w-120 max-w-full flex-col border-l border-border bg-card shadow-raised outline-none 3xl:right-[calc((100vw-var(--container-shell))/2)] 3xl:border-r"
      >
        {children}
      </aside>
    );
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogSidePanel
        side="right"
        aria-labelledby={titleId}
        className="w-full bg-card sm:w-120"
      >
        {children}
      </DialogSidePanel>
    </Dialog>
  );
};
