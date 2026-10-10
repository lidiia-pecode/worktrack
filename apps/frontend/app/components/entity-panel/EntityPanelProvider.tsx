"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  EntityRef,
  formatEntityRef,
  OPEN_PARAM,
  parseEntityRef,
  urlWithOpenEntity,
} from "@/lib/utils/entity-ref";

import {
  EntityPanelContext,
  EntityPanelContextValue,
  TrailEntry,
} from "./entity-panel-context";
import { EntityPanel } from "./EntityPanel";

interface Trail {
  /** The `?open=` value the trail leads to. */
  openValue: string | null;
  entries: TrailEntry[];
}

const EMPTY_TRAIL: Trail = { openValue: null, entries: [] };

/**
 * The entity panel of a Manage page, kept in `?open=<type>:<id>`.
 *
 * Opening it from a list adds a history entry, so browser Back closes it; links
 * inside it replace the URL and build a trail that its own Back walks. The
 * trail lives only in memory: a reload keeps the entity and drops the trail.
 */
export const EntityPanelProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openValue = searchParams.get(OPEN_PARAM);
  const current = parseEntityRef(openValue);

  const [trail, setTrail] = useState<Trail>(EMPTY_TRAIL);
  // Any other change of `?open=` (another row, browser Back) starts afresh.
  const entries = trail.openValue === openValue ? trail.entries : [];

  const openedWithHistoryEntry = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openValue) openedWithHistoryEntry.current = false;
  }, [openValue]);

  const writeUrl = (ref: EntityRef | null, mode: "push" | "replace") => {
    const url = urlWithOpenEntity(pathname, searchParams, ref);

    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };

  const showWithTrail = (ref: EntityRef, nextEntries: TrailEntry[]) => {
    setTrail({ openValue: formatEntityRef(ref), entries: nextEntries });
    writeUrl(ref, "replace");
  };

  const open = (ref: EntityRef) => {
    if (current) {
      writeUrl(ref, "replace");
      return;
    }

    returnFocusTo.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    openedWithHistoryEntry.current = true;
    writeUrl(ref, "push");
  };

  const follow = (ref: EntityRef, fromName: string) => {
    if (!current) {
      open(ref);
      return;
    }

    showWithTrail(ref, [...entries, { ref: current, name: fromName }]);
  };

  const back = () => {
    const previous = entries.at(-1);
    if (previous) showWithTrail(previous.ref, entries.slice(0, -1));
  };

  const close = () => {
    if (openedWithHistoryEntry.current) {
      openedWithHistoryEntry.current = false;
      window.history.back();
    } else {
      writeUrl(null, "replace");
    }

    returnFocusTo.current?.focus();
    returnFocusTo.current = null;
  };

  const value: EntityPanelContextValue = {
    current,
    previous: entries.at(-1) ?? null,
    open,
    follow,
    back,
    close,
    hrefFor: (ref) => urlWithOpenEntity(pathname, searchParams, ref),
  };

  return (
    <EntityPanelContext.Provider value={value}>
      {children}
      <EntityPanel />
    </EntityPanelContext.Provider>
  );
};
