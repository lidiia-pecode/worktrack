"use client";

import { createContext, useContext } from "react";

import type { EntityRef } from "@/lib/utils/entity-ref";

export interface TrailEntry {
  ref: EntityRef;
  name: string;
}

export interface EntityPanelContextValue {
  current: EntityRef | null;
  /** The entity Back returns to, if the panel was reached from another one. */
  previous: TrailEntry | null;
  /** From a list or a link outside the panel: starts a new trail. */
  open: (ref: EntityRef) => void;
  /** From a link inside the panel: the entity shown now joins the trail. */
  follow: (ref: EntityRef, fromName: string) => void;
  back: () => void;
  close: () => void;
  hrefFor: (ref: EntityRef) => string;
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
