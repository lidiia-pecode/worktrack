"use client";

import { createContext, useContext } from "react";

import type { EntityRef } from "@/lib/utils/entity-ref";

export interface TrailEntry {
  ref: EntityRef;
  name: string;
  /** A view of that entity, such as a picker, rather than the entity itself. */
  view: string | null;
}

export interface EntityPanelContextValue {
  current: EntityRef | null;
  /** The entity Back returns to, if the panel was reached from another one. */
  previous: TrailEntry | null;
  /** From a list or a link outside the panel: starts a new trail. */
  open: (ref: EntityRef) => void;
  /** From a link inside the panel: the entity shown now joins the trail. */
  follow: (ref: EntityRef, fromName: string) => void;
  /** A view of the entity shown, such as a picker; null for the entity itself. */
  view: string | null;
  /** Shows a view of the entity shown, which Back returns from. */
  openView: (view: string, fromName: string) => void;
  back: () => void;
  close: () => void;
  hrefFor: (ref: EntityRef) => string;
  /** Whether the entity shown is open in its form. */
  isEditing: boolean;
  /** Shows the entity in its form, opening the panel if needed. */
  edit: (ref: EntityRef) => void;
  stopEditing: () => void;
  /** While set, leaving the entity asks whether to discard the changes. */
  setHasUnsavedChanges: (hasUnsavedChanges: boolean) => void;
}

export const EntityPanelContext = createContext<EntityPanelContextValue | null>(
  null,
);

export const useEntityPanel = () => {
  const context = useContext(EntityPanelContext);

  if (!context) {
    throw new Error("useEntityPanel must be used inside EntityPanelProvider");
  }

  return context;
};

/** The entity a panel is showing, which a link inside it is followed from. */
export const PanelEntityContext = createContext<{ name: string } | null>(null);

/** The id of the panel's heading, which labels the panel. */
export const PanelTitleIdContext = createContext<string | undefined>(undefined);
