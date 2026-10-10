"use client";

import type { MouseEvent, ReactNode } from "react";
import { MoreHorizontal, Pencil, type LucideIcon } from "lucide-react";

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

/** One entity's row, which both the table and the phone list render. */
export interface ManageRowDefinition<T> {
  getKey: (item: T) => string;
  getName: (item: T) => string;
  /** A quieter line under the name, such as an email. */
  getDetail?: (item: T) => ReactNode;
  /** Shows the entity's details, from the row or its name. */
  onOpen: (item: T) => void;
  /** Opens the entity's form, the menu's first item, where `canEdit` allows. */
  onEdit?: (item: T) => void;
  canEdit?: (item: T) => boolean;
  columns: ManageColumn<T>[];
  /** The menu's actions after Edit, such as Archive. */
  getActions?: (item: T) => ManageRowAction[];
}

/** "1 project", "3 projects". */
export const countLabel = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

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

const RowName = <T,>({ item, row }: RowPartProps<T>) => {
  const detail = row.getDetail?.(item);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          stopRowClick(event);
          row.onOpen(item);
        }}
        className="block max-w-full truncate rounded-sm text-left font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {row.getName(item)}
      </button>

      {detail && (
        <span className="block truncate text-xs font-normal text-muted-foreground">
          {detail}
        </span>
      )}
    </>
  );
};

const RowMenu = <T,>({ item, row }: RowPartProps<T>) => {
  const actions = row.getActions?.(item) ?? [];
  const onEdit = row.onEdit;
  const canEdit = Boolean(onEdit) && (row.canEdit?.(item) ?? true);

  if (!canEdit && actions.length === 0) return null;

  return (
    <div onClick={stopRowClick}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              aria-label={`Actions for ${row.getName(item)}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-44 p-0">
          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit?.(item)}>
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
              onClick={action.onSelect}
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

const ROW_HOVER = "cursor-pointer transition-colors hover:bg-muted/30";

/**
 * A table from `lg` up and a two-line list below it: the sidebar takes its
 * space from `md`, which leaves too little room for the columns.
 */
export const ManageList = <T,>({ label, items, row }: ManageListProps<T>) => (
  <Card>
    <div className="hidden lg:block">
      <Table aria-label={label} className="table-fixed">
        <TableHeader>
          <TableHead>Name</TableHead>

          {row.columns.map((column) => (
            <TableHead
              key={column.header}
              numeric={column.numeric}
              className={column.width}
            >
              {column.header}
            </TableHead>
          ))}

          <TableHead className="w-14">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableHeader>

        <TableBody>
          {items.map((item) => (
            <TableRow
              key={row.getKey(item)}
              onClick={() => row.onOpen(item)}
              className={ROW_HOVER}
            >
              <TableRowHeader>
                <RowName item={item} row={row} />
              </TableRowHeader>

              {row.columns.map((column) => (
                <TableCell key={column.header} numeric={column.numeric}>
                  {column.cell(item)}
                </TableCell>
              ))}

              <TableCell className="py-1.5 text-right">
                <RowMenu item={item} row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <ul aria-label={label} className="divide-y divide-border lg:hidden">
      {items.map((item) => (
        <li
          key={row.getKey(item)}
          onClick={() => row.onOpen(item)}
          className={cn("flex items-center gap-2 py-3 pr-2 pl-4", ROW_HOVER)}
        >
          <div className="min-w-0 flex-1 text-sm">
            <RowName item={item} row={row} />

            <RowSummary item={item} row={row} />
          </div>

          <RowMenu item={item} row={row} />
        </li>
      ))}
    </ul>
  </Card>
);
