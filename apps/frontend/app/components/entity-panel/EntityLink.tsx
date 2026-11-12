"use client";

import { Fragment, MouseEvent, ReactNode, useContext } from "react";

import type { EntityRef } from "@/lib/utils/entity-ref";
import { cn } from "@/lib/utils/cn";

import { PanelEntityContext, useEntityPanel } from "./entity-panel-context";

interface EntityLinkProps {
  entity: EntityRef;
  children: ReactNode;
  className?: string;
  /** Runs before the panel opens, such as closing the dialog the link is in. */
  onNavigate?: () => void;
  /** `brand` in running text; `plain` in a row or a detail, which shows it opens. */
  tone?: "brand" | "plain";
}

const TONE_CLASSES = {
  brand: "font-medium text-brand underline-offset-4 hover:underline",
  plain: "text-foreground hover:text-brand",
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
    // Keeps a link in a row from also opening the row.
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

export const linkedEntities = (
  type: EntityRef["type"],
  items: { id: string; name: string }[],
): LinkedEntity[] =>
  items.map(({ id, name }) => ({ entity: { type, id }, name }));

interface EntityLinksProps extends Pick<
  EntityLinkProps,
  "tone" | "onNavigate"
> {
  entities: LinkedEntity[];
}

/** Several related names, comma-separated. */
export const EntityLinks = ({ entities, tone, onNavigate }: EntityLinksProps) =>
  entities.map(({ entity, name }, index) => (
    <Fragment key={entity.id}>
      {index > 0 && ", "}
      <EntityLink entity={entity} tone={tone} onNavigate={onNavigate}>
        {name}
      </EntityLink>
    </Fragment>
  ));
