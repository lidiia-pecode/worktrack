"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  EntityRef,
  formatEntityRef,
  OPEN_PARAM,
  parseEntityRef,
  urlWithOpenEntity,
} from "@/lib/utils/entity-ref";

import { ConfirmModal } from "../shared/ConfirmModal";
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
 * Leaving an entity whose form has unsaved changes first asks to discard them.
 */
export const EntityPanelProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openValue = searchParams.get(OPEN_PARAM);
  const current = parseEntityRef(openValue);

  const [trail, setTrail] = useState<Trail>(EMPTY_TRAIL);
  // Any other change of `?open=` (another row, browser Back) starts afresh.
  const entries = trail.openValue === openValue ? trail.entries : [];

  // Any change of `?open=` ends editing, as the trail above does.
  const [editingOpenValue, setEditingOpenValue] = useState<string | null>(null);
  const isEditing = openValue !== null && editingOpenValue === openValue;

  const hasUnsavedChanges = useRef(false);
  const [pendingLeave, setPendingLeave] = useState<{
    navigate: () => void;
  } | null>(null);

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

  const isShown = (ref: EntityRef) => formatEntityRef(ref) === openValue;

  const leave = (navigate: () => void) => {
    if (hasUnsavedChanges.current) {
      setPendingLeave({ navigate });
      return;
    }

    setEditingOpenValue(null);
    navigate();
  };

  const discardAndLeave = () => {
    hasUnsavedChanges.current = false;
    setEditingOpenValue(null);
    pendingLeave?.navigate();
    setPendingLeave(null);
  };

  const show = (ref: EntityRef) => {
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

  const open = (ref: EntityRef) => {
    if (!isShown(ref)) leave(() => show(ref));
  };

  const follow = (ref: EntityRef, fromName: string) =>
    leave(() => {
      if (current) {
        showWithTrail(ref, [...entries, { ref: current, name: fromName }]);
      } else {
        show(ref);
      }
    });

  const back = () => {
    const previous = entries.at(-1);
    if (previous)
      leave(() => showWithTrail(previous.ref, entries.slice(0, -1)));
  };

  const close = () =>
    leave(() => {
      if (openedWithHistoryEntry.current) {
        openedWithHistoryEntry.current = false;
        window.history.back();
      } else {
        writeUrl(null, "replace");
      }

      returnFocusTo.current?.focus();
      returnFocusTo.current = null;
    });

  const edit = (ref: EntityRef) => {
    if (isShown(ref) && isEditing) return;

    leave(() => {
      if (!isShown(ref)) show(ref);
      setEditingOpenValue(formatEntityRef(ref));
    });
  };

  const stopEditing = () => {
    hasUnsavedChanges.current = false;
    setEditingOpenValue(null);
  };

  const setHasUnsavedChanges = useCallback((value: boolean) => {
    hasUnsavedChanges.current = value;
  }, []);

  const value: EntityPanelContextValue = {
    current,
    previous: entries.at(-1) ?? null,
    open,
    follow,
    back,
    close,
    hrefFor: (ref) => urlWithOpenEntity(pathname, searchParams, ref),
    isEditing,
    edit,
    stopEditing,
    setHasUnsavedChanges,
  };

  return (
    <EntityPanelContext.Provider value={value}>
      {children}
      <EntityPanel />

      <ConfirmModal
        isOpen={Boolean(pendingLeave)}
        title="Discard your changes?"
        message="What you changed here isn't saved yet."
        confirmText="Discard"
        cancelText="Keep editing"
        variant="danger"
        onConfirm={discardAndLeave}
        onClose={() => setPendingLeave(null)}
      />
    </EntityPanelContext.Provider>
  );
};
