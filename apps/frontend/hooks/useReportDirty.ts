"use client";

import { useEffect } from "react";

/** Tells the panel whether a form has unsaved changes, and that it has none once gone. */
export const useReportDirty = (
  isDirty: boolean,
  onDirtyChange?: (isDirty: boolean) => void,
) =>
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);
