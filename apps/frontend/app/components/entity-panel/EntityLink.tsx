"use client";

import { Fragment, MouseEvent, ReactNode, useContext } from "react";

import type { EntityRef } from "@/lib/utils/entity-ref";
import { cn } from "@/lib/utils/cn";

import { PanelEntityContext, useEntityPanel } from "./entity-panel-context";

interface EntityLinkProps {
  entity: EntityRef;
  children: ReactNode;
  className?: string;
  /** Called when the link opens the panel, such as to close the dialog it sits in. */
  onNavigate?: () => void;
  /**
   * `brand` in running text; `plain` in a row, which itself shows it opens;
   * `chip` for a name standing alone, such as an activity's category.
   */
  tone?: "brand" | "plain" | "chip";
}

const TONE_CLASSES = {
  brand: "font-medium text-brand underline-offset-4 hover:underline",
  plain: "text-foreground hover:text-brand",
  // The padding is narrower beside an avatar than beside an icon.
  chip: "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pr-2.5 pl-0.5 font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-muted/30 has-[>svg]:pl-2",
} as const;

const opensElsewhere = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/** Inside a panel an entity joins the panel's trail; elsewhere it opens the panel afresh. */
export const useOpenEntity = () => {
  const panel = useEntityPanel();
  const panelEntity = useContext(PanelEntityContext);

  return (entity: EntityRef) =>
    panelEntity ? panel.follow(entity, panelEntity.name) : panel.open(entity);
};

/** A related entity's name. A modified click opens it in a new tab. */
export const EntityLink = ({
  entity,
  children,
  className,
  onNavigate,
  tone = "brand",
}: EntityLinkProps) => {
  const panel = useEntityPanel();
  const openEntity = useOpenEntity();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // A link in a list row would otherwise also open the row's own entity.
    event.stopPropagation();
    if (opensElsewhere(event)) return;

    event.preventDefault();
    onNavigate?.();
    openEntity(entity);
  };

  return (
    <a
      href={panel.hrefFor(entity)}
      onClick={handleClick}
      className={cn(
        "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </a>
  );
};

export interface LinkedEntity {
  entity: EntityRef;
  name: string;
}

interface EntityLinksProps {
  entities: LinkedEntity[];
  tone?: EntityLinkProps["tone"];
}

/** Several related names, such as a person's teams, comma-separated. */
export const EntityLinks = ({ entities, tone }: EntityLinksProps) =>
  entities.map(({ entity, name }, index) => (
    <Fragment key={entity.id}>
      {index > 0 && ", "}
      <EntityLink entity={entity} tone={tone}>
        {name}
      </EntityLink>
    </Fragment>
  ));
