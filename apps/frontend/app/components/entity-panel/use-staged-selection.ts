"use client";

import { useEffect, useState } from "react";

import { useEntityPanel } from "./entity-panel-context";

export interface Choice {
  id: string;
  name: string;
}

/**
 * A picker's choices as a draft, applied together on Done: what is linked now
 * starts selected, choosing it again marks it for removal, and anything new is
 * marked for adding. While something is pending, leaving asks to discard it.
 */
export const useStagedSelection = <T extends Choice>(current: T[]) => {
  const { back, setHasUnsavedChanges } = useEntityPanel();
  const [added, setAdded] = useState<T[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const currentIds = current.map((item) => item.id);
  // Once applied, a pending addition is simply current, and a removal gone.
  const toAdd = added.filter((item) => !currentIds.includes(item.id));
  const toRemove = current.filter((item) => removedIds.includes(item.id));
  const pendingCount = toAdd.length + toRemove.length;

  const selectedIds = [
    ...currentIds.filter((id) => !removedIds.includes(id)),
    ...toAdd.map((item) => item.id),
  ];

  useEffect(() => {
    setHasUnsavedChanges(pendingCount > 0);
  }, [pendingCount, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);

  const toggle = (item: T) => {
    if (currentIds.includes(item.id)) {
      setRemovedIds((ids) =>
        ids.includes(item.id)
          ? ids.filter((id) => id !== item.id)
          : [...ids, item.id],
      );
      return;
    }

    setAdded((items) =>
      items.some((other) => other.id === item.id)
        ? items.filter((other) => other.id !== item.id)
        : [...items, item],
    );
  };

  /** Marks one for adding, such as one just created. */
  const select = (item: T) =>
    setAdded((items) =>
      items.some((other) => other.id === item.id) ? items : [...items, item],
    );

  const leave = (afterwards: () => void = back) => {
    setHasUnsavedChanges(false);
    afterwards();
  };

  /**
   * Runs the changes and leaves once all of them succeed. A failure is reported
   * by the global mutation handler, and the picker stays with what is left.
   */
  const apply = async (
    changes: Promise<unknown>[],
    afterwards?: () => void,
  ) => {
    setIsApplying(true);
    try {
      await Promise.all(changes);
      leave(afterwards);
    } catch {
      // Reported already; the draft keeps what did not go through.
    } finally {
      setIsApplying(false);
    }
  };

  return {
    selectedIds,
    toAdd,
    toRemove,
    pendingCount,
    isApplying,
    toggle,
    select,
    apply,
    cancel: () => leave(),
  };
};
