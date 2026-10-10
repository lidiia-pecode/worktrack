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
  /** `plain` in a table, where the row carries the colour and a link shows on hover. */
  tone?: "brand" | "plain";
}

const opensElsewhere = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * A related entity's name. Inside a panel it adds to the panel's trail; in a
 * list it opens the panel afresh. A modified click opens it in a new tab.
 */
export const EntityLink = ({
  entity,
  children,
  className,
  onNavigate,
  tone = "brand",
}: EntityLinkProps) => {
  const panel = useEntityPanel();
  const panelEntity = useContext(PanelEntityContext);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // A link in a list row would otherwise also open the row's own entity.
    event.stopPropagation();
    if (opensElsewhere(event)) return;

    event.preventDefault();
    onNavigate?.();

    if (panelEntity) panel.follow(entity, panelEntity.name);
    else panel.open(entity);
  };

  return (
    <a
      href={panel.hrefFor(entity)}
      onClick={handleClick}
      className={cn(
        "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tone === "brand"
          ? "font-medium text-brand"
          : "text-foreground hover:text-brand",
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
