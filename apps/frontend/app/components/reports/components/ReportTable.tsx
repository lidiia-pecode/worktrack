"use client";

import { ReactNode, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { nextSort, SortState, sortRows } from "@/lib/utils/report-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";

export interface ReportColumn<T> {
  key: string;
  label: string;
  numeric?: boolean;
  className?: string;
  /** What the column sorts by. */
  sortValue: (row: T) => number | string;
  render: (row: T) => ReactNode;
}

type ReportTableProps<T> = {
  label: string;
  /** The first column, naming each row. */
  name: {
    label: string;
    sortValue: (row: T) => string;
    render: (row: T) => { name: ReactNode; detail?: ReactNode };
  };
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** The first row: the whole period, shaped like a row. */
  totals: { label: string; detail: string; row: T };
  className?: string;
};

const SortableHead = ({
  label,
  numeric,
  sort,
  column,
  className,
  onSort,
}: {
  label: string;
  numeric: boolean;
  sort: SortState | null;
  column: string;
  className?: string;
  onSort: () => void;
}) => {
  const direction = sort?.column === column ? sort.direction : null;
  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      numeric={numeric}
      className={className}
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : undefined
      }
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          direction && "text-foreground",
        )}
      >
        {label}
        <Arrow
          className={cn("size-3", !direction && "invisible")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
};

/**
 * A report table whose first row is the period's totals, set apart and never
 * sorted, and whose every column sorts. Rows keep the server's order until a
 * column is picked.
 */
export const ReportTable = <T,>({
  label,
  name,
  columns,
  rows,
  rowKey,
  totals,
  className,
}: ReportTableProps<T>) => {
  const [sort, setSort] = useState<SortState | null>(null);

  const sortColumn =
    sort?.column === "name"
      ? name.sortValue
      : columns.find((column) => column.key === sort?.column)?.sortValue;
  const shownRows =
    sort && sortColumn ? sortRows(rows, sortColumn, sort.direction) : rows;

  return (
    <Table className={className} aria-label={label}>
      <TableHeader>
        <SortableHead
          label={name.label}
          numeric={false}
          sort={sort}
          column="name"
          onSort={() => setSort(nextSort(sort, "name", false))}
        />
        {columns.map((column) => (
          <SortableHead
            key={column.key}
            label={column.label}
            numeric={Boolean(column.numeric)}
            sort={sort}
            column={column.key}
            className={column.className}
            // Every column but the name holds a number, gaps included.
            onSort={() => setSort(nextSort(sort, column.key, true))}
          />
        ))}
      </TableHeader>

      <TableBody>
        <TableRow className="bg-brand-subtle font-semibold">
          <TableRowHeader detail={totals.detail} className="font-semibold">
            {totals.label}
          </TableRowHeader>
          {columns.map((column) => (
            <TableCell key={column.key} numeric={column.numeric}>
              {column.render(totals.row)}
            </TableCell>
          ))}
        </TableRow>

        {shownRows.map((row) => {
          const { name: rowName, detail } = name.render(row);

          return (
            <TableRow key={rowKey(row)}>
              <TableRowHeader detail={detail}>{rowName}</TableRowHeader>
              {columns.map((column) => (
                <TableCell key={column.key} numeric={column.numeric}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
