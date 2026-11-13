"use client";

import { createContext, ReactNode, useContext } from "react";

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

/**
 * Set while the panel's own form is open: the form edits the entity where its
 * facts stood, the name beside the panel's leading mark and the rest in a card.
 */
export const PanelFormContext = createContext<{ leading?: ReactNode } | null>(
  null,
);

/** The id of the panel's heading, which labels the panel. */
export const PanelTitleIdContext = createContext<string | undefined>(undefined);

/**
 * The place in the panel's top bar, before its close button, where the entity
 * shown puts its actions, such as Edit and Archive, so its name keeps the
 * panel's whole width.
 */
export const PanelActionsSlotContext = createContext<HTMLElement | null>(null);

/**
 * The place under the panel's scrolling body where an open form or picker puts
 * its Cancel and Save, so the bar stays at the panel's bottom as in a dialog.
 */
export const PanelFooterSlotContext = createContext<HTMLElement | null>(null);
