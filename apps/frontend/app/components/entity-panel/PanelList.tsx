"use client";

import { Fragment, MouseEvent, ReactNode, useRef, useState } from "react";
import { MoreHorizontal, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EntityRef } from "@/lib/utils/entity-ref";
import { cn } from "@/lib/utils/cn";

import type { ManageRowAction } from "../shared/resource/ManageList";
import { EntityLink, useOpenEntity } from "./EntityLink";

const VISIBLE_ITEMS = 8;

interface PanelListRow {
  /** What the row opens, from a click anywhere on it; a row without one, such as an invitation, opens nothing. */
  entity?: EntityRef;
  name: string;
  leading?: ReactNode;
  detail?: ReactNode;
  /** Why the row reads differently, such as an Archived badge. */
  status?: ReactNode;
  /** Changes the link itself, such as a member's role in a team, from a "⋯" menu. */
  actions?: ManageRowAction[];
  /** Takes it off this list; left out when the row can't change. */
  remove?: { label: string; onClick: () => void };
  /** Archived or deactivated, so it reads quieter. */
  isInactive?: boolean;
}

interface PanelListGroup {
  key: string;
  heading: ReactNode;
}

interface PanelListProps<T> {
  title: string;
  items: T[];
  getKey: (item: T) => string;
  renderRow: (item: T) => PanelListRow;
  emptyText: ReactNode;
  /** Under the title, such as how many members the viewer cannot see. */
  note?: ReactNode;
  /** Opens the section's picker; left out when the viewer cannot add. */
  add?: { label: string; icon: LucideIcon; onClick: () => void };
  /** Rows under headings, such as a project's activities by category; items come sorted by it. Null leaves a row under no heading. */
  groupBy?: (item: T) => PanelListGroup | null;
}

const stopRowClick = (event: MouseEvent) => event.stopPropagation();

const RemoveButton = ({
  label,
  onClick,
}: NonNullable<PanelListRow["remove"]>) => (
  <Button
    type="button"
    variant="ghost"
    size="iconSm"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="text-muted-foreground hover:bg-warning-subtle hover:text-warning-text"
  >
    <X className="size-4" />
  </Button>
);

/** Actions behind a "⋯" button: a row's link changes, or a panel's Archive. */
export const ActionsMenu = ({
  label,
  actions,
  variant = "ghost",
}: {
  label: string;
  actions: ManageRowAction[];
  variant?: "ghost" | "outline";
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);

  // What an item opens returns focus to the trigger, as in the Manage tables.
  const select = (action: () => void) => {
    triggerRef.current?.focus();
    action();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size="iconSm"
            ref={triggerRef}
            aria-label={label}
            title={label}
            className="text-muted-foreground hover:text-foreground data-popup-open:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-44 p-0">
        {actions.map((action, index) => (
          <Fragment key={action.label}>
            {/* Archive and Deactivate apart from the changes before them. */}
            {action.warning && index > 0 && !actions[index - 1].warning && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              variant={action.warning ? "warning" : "default"}
              onClick={() => select(action.onSelect)}
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * The whole row opens its entity, as a row does in the Manage tables. Its
 * controls show on hover or focus where there is a pointer, always on touch.
 */
const Row = ({ row }: { row: PanelListRow }) => {
  const openEntity = useOpenEntity();
  const { entity } = row;
  const hasActions = Boolean(row.actions?.length);
  const hasControls = hasActions || row.remove;

  return (
    <li
      onClick={entity && (() => openEntity(entity))}
      className={cn(
        "group flex min-h-10 items-center gap-3 px-3 py-2 text-sm",
        entity && "cursor-pointer transition-colors hover:bg-muted/30",
      )}
    >
      {row.leading && (
        <span aria-hidden="true" className="shrink-0">
          {row.leading}
        </span>
      )}

      <div className={cn("min-w-0 flex-1", row.isInactive && "opacity-60")}>
        {entity ? (
          <EntityLink
            entity={entity}
            tone="plain"
            className="block max-w-full truncate font-medium"
          >
            {row.name}
          </EntityLink>
        ) : (
          <p className="truncate font-medium text-foreground">{row.name}</p>
        )}

        {row.detail && (
          <div className="truncate text-xs text-muted-foreground">
            {row.detail}
          </div>
        )}
      </div>

      {row.status && <div className="shrink-0">{row.status}</div>}

      {hasControls && (
        <div
          onClick={stopRowClick}
          className="-my-1 flex shrink-0 items-center gap-0.5 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100 pointer-fine:has-data-popup-open:opacity-100"
        >
          {hasActions && (
            <ActionsMenu
              label={`Actions for ${row.name}`}
              actions={row.actions!}
            />
          )}
          {row.remove && <RemoveButton {...row.remove} />}
        </div>
      )}
    </li>
  );
};

/** A relationship section: the first few related entities, and the rest on request. */
export const PanelList = <T,>({
  title,
  items,
  getKey,
  renderRow,
  emptyText,
  note,
  add,
  groupBy,
}: PanelListProps<T>) => {
  const [showsAll, setShowsAll] = useState(false);
  const shownItems = showsAll ? items : items.slice(0, VISIBLE_ITEMS);
  const hiddenCount = items.length - shownItems.length;

  return (
    <PanelCard
      title={title}
      count={items.length}
      action={
        add && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={add.onClick}
            // The section's title says what is added to.
            aria-label={add.label}
            title={add.label}
            className="-mr-1.5 text-brand hover:text-brand"
          >
            <add.icon className="size-3.5" />
            Add
          </Button>
        )
      }
    >
      {note && (
        <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
          {note}
        </p>
      )}

      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {shownItems.map((item, index) => {
            const group = groupBy?.(item);
            const startsGroup =
              group &&
              (index === 0 ||
                groupBy?.(shownItems[index - 1])?.key !== group.key);

            return (
              <Fragment key={getKey(item)}>
                {startsGroup && (
                  <li className="bg-muted/10 px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                    {group.heading}
                  </li>
                )}
                <Row row={renderRow(item)} />
              </Fragment>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <div className="border-t border-border px-1.5 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowsAll(true)}
          >
            Show all {items.length}
          </Button>
        </div>
      )}
    </PanelCard>
  );
};

type PanelCardProps = {
  title: string;
  /** How many items the section holds, after its title. */
  count?: number;
  /** Beside the title, such as Add or a warning. */
  action?: ReactNode;
  children: ReactNode;
};

/** A list section: a card with its title, count and Add in a bar on top. */
const PanelCard = ({ title, count, action, children }: PanelCardProps) => (
  <section className="overflow-hidden rounded-xl border border-border">
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-1">
      <h3 className="text-xs font-medium text-muted-foreground">
        {title}
        {count !== undefined && (
          <span className="ml-1.5 tabular-nums">{count}</span>
        )}
      </h3>
      {action}
    </div>
    {children}
  </section>
);
