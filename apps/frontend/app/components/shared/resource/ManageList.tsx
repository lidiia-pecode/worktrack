"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import type { EntityRef } from "@/lib/utils/entity-ref";

import { EntityLink } from "../../entity-panel/EntityLink";
import { useEntityPanel } from "../../entity-panel/entity-panel-context";

export interface ManageColumn<T> {
  header: string;
  cell: (item: T) => ReactNode;
  /** How the value reads on a phone, where no column header names it, such as "3 projects"; null leaves it out. */
  summary?: (item: T) => ReactNode;
  numeric?: boolean;
  /** A fixed width, such as `w-32`; the name column takes the rest. */
  width: string;
}

export interface ManageRowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
}

/** Archive for an active entity, Restore for an archived one. */
export const archiveOrRestore = (
  isActive: boolean,
  { archive, restore }: { archive: () => void; restore: () => void },
): ManageRowAction[] =>
  isActive
    ? [
        {
          label: "Archive",
          icon: Archive,
          destructive: true,
          onSelect: archive,
        },
      ]
    : [{ label: "Restore", icon: ArchiveRestore, onSelect: restore }];

/** One entity's row, which both the table and the phone list render. */
export interface ManageRowDefinition<T> {
  getKey: (item: T) => string;
  getName: (item: T) => string;
  /** A quieter line under the name, such as an email. */
  getDetail?: (item: T) => ReactNode;
  /** Before the name, such as a person's avatar; decorative, since the name says it. */
  getLeading?: (item: T) => ReactNode;
  /** What the row and its name open in the entity panel. */
  getEntity: (item: T) => EntityRef;
  /** Opens the entity's form, the menu's first item, where `canEdit` allows. */
  onEdit?: (item: T) => void;
  canEdit?: (item: T) => boolean;
  columns: ManageColumn<T>[];
  /** The menu's actions after Edit, such as Archive. */
  getActions?: (item: T) => ManageRowAction[];
}

/** A count in a column; zero is muted. */
export const ManageCount = ({ count }: { count: number }) => (
  <span className={count === 0 ? "text-muted-foreground" : undefined}>
    {count}
  </span>
);

interface ManageWarningProps {
  children: ReactNode;
  /** In a phone row's summary line, where a badge would crowd the text. */
  inline?: boolean;
}

/** Something that needs attention, such as a team with no active manager. */
export const ManageWarning = ({
  children,
  inline = false,
}: ManageWarningProps) =>
  inline ? (
    <span className="font-medium text-warning-text">{children}</span>
  ) : (
    <Badge variant="warning">{children}</Badge>
  );

// The row opens on click; the name and the menu handle their own clicks.
const stopRowClick = (event: MouseEvent) => event.stopPropagation();

interface RowPartProps<T> {
  item: T;
  row: ManageRowDefinition<T>;
}

// The name keeps the text colour: the row's hover already says it opens.
const RowName = <T,>({
  item,
  row,
  children,
}: RowPartProps<T> & { children?: ReactNode }) => {
  const detail = row.getDetail?.(item);
  const leading = row.getLeading?.(item);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {leading && (
        <span aria-hidden="true" className="shrink-0">
          {leading}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <EntityLink
          entity={row.getEntity(item)}
          tone="plain"
          className="block max-w-full truncate font-medium"
        >
          {row.getName(item)}
        </EntityLink>

        {detail && (
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {detail}
          </span>
        )}

        {children}
      </div>
    </div>
  );
};

const RowMenu = <T,>({ item, row }: RowPartProps<T>) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const actions = row.getActions?.(item) ?? [];
  const onEdit = row.onEdit;
  const canEdit = Boolean(onEdit) && (row.canEdit?.(item) ?? true);

  if (!canEdit && actions.length === 0) return null;

  // The item goes with its menu, so what it opens returns focus to the trigger.
  const select = (action: () => void) => {
    triggerRef.current?.focus();
    action();
  };

  return (
    <div onClick={stopRowClick}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              ref={triggerRef}
              aria-label={`Actions for ${row.getName(item)}`}
              className="text-muted-foreground group-hover:text-foreground data-popup-open:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-44 p-0">
          {canEdit && (
            <DropdownMenuItem onClick={() => select(() => onEdit?.(item))}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          )}

          {canEdit && actions.length > 0 && (
            <DropdownMenuSeparator className="m-0" />
          )}

          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              variant={action.destructive ? "destructive" : "default"}
              onClick={() => select(action.onSelect)}
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const RowSummary = <T,>({ item, row }: RowPartProps<T>) => {
  const parts = row.columns
    .map((column) => ({
      key: column.header,
      content: (column.summary ?? column.cell)(item),
    }))
    .filter((part) => part.content !== null);

  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {parts.map((part, index) => (
        <span key={part.key}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {part.content}
        </span>
      ))}
    </p>
  );
};

interface ManageListProps<T> {
  label: string;
  items: T[];
  row: ManageRowDefinition<T>;
}

const ROW_HOVER = "group cursor-pointer transition-colors hover:bg-muted/30";

// One height for every Manage table, whether its rows have a second line or
// not, and the same inset at both edges of the header and the rows.
const ROW_HEIGHT = "h-14";
const HEAD_HEIGHT = "h-10 py-0";
const EDGE_START = "pl-5";
const EDGE_END = "pr-4";

/**
 * A table from `lg` up and a two-line list below it: the sidebar takes its
 * space from `md`, which leaves too little room for the columns. An open
 * panel takes as much again, so beside it the table waits for `2xl`.
 */
export const ManageList = <T,>({ label, items, row }: ManageListProps<T>) => {
  const panel = useEntityPanel();
  const isBesidePanel = Boolean(panel.current);

  // A click on the row moves focus to its name, which closing the panel returns to.
  const openRow = (event: MouseEvent<HTMLElement>, item: T) => {
    event.currentTarget.querySelector<HTMLElement>("a")?.focus();
    panel.open(row.getEntity(item));
  };

  return (
    <Card>
      <div className={cn("hidden", isBesidePanel ? "2xl:block" : "lg:block")}>
        <Table aria-label={label} className="table-fixed">
          <TableHeader>
            <TableHead className={cn(HEAD_HEIGHT, EDGE_START)}>Name</TableHead>

            {row.columns.map((column) => (
              <TableHead
                key={column.header}
                numeric={column.numeric}
                className={cn(HEAD_HEIGHT, column.width)}
              >
                {column.header}
              </TableHead>
            ))}

            <TableHead className={cn(HEAD_HEIGHT, "w-16", EDGE_END)}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableHeader>

          <TableBody>
            {items.map((item) => (
              <TableRow
                key={row.getKey(item)}
                onClick={(event) => openRow(event, item)}
                className={cn(ROW_HOVER, ROW_HEIGHT)}
              >
                <TableRowHeader className={cn("py-2", EDGE_START)}>
                  <RowName item={item} row={row} />
                </TableRowHeader>

                {row.columns.map((column) => (
                  <TableCell
                    key={column.header}
                    numeric={column.numeric}
                    className="py-2"
                  >
                    {column.cell(item)}
                  </TableCell>
                ))}

                <TableCell className={cn("py-2 text-right", EDGE_END)}>
                  <RowMenu item={item} row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul
        aria-label={label}
        className={cn(
          "divide-y divide-border",
          isBesidePanel ? "2xl:hidden" : "lg:hidden",
        )}
      >
        {items.map((item) => (
          <li
            key={row.getKey(item)}
            onClick={(event) => openRow(event, item)}
            className={cn("flex items-center gap-2 py-3 pr-2 pl-4", ROW_HOVER)}
          >
            <div className="min-w-0 flex-1 text-sm">
              <RowName item={item} row={row}>
                <RowSummary item={item} row={row} />
              </RowName>
            </div>

            <RowMenu item={item} row={row} />
          </li>
        ))}
      </ul>
    </Card>
  );
};
