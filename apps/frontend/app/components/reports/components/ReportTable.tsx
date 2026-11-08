"use client";

import { ReactNode, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { countLabel } from "@/lib/utils/text";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";

import { AttentionDot } from "./ReportRow";

/** Rows shown at first; the rest open on request. */
const ROWS_SHOWN = 10;

type SortValue = number | string | null;

export type ReportColumn<T> = {
  header: string;
  /** Right-aligned figures; sorting them starts with the largest. */
  numeric?: boolean;
  /** The column's width at table size, as a class. */
  width?: string;
  cell: (row: T) => ReactNode;
  /** What the column sorts by; none lasts in either direction. */
  sortValue: (row: T) => SortValue;
};

type Sort = { column: string; direction: "asc" | "desc" };

const compare = (a: number | string, b: number | string) =>
  typeof a === "string" && typeof b === "string"
    ? a.localeCompare(b)
    : Number(a) - Number(b);

/** Sorted by the column, with rows that have no value for it last. */
const sortRows = <T,>(rows: T[], column: ReportColumn<T>, sort: Sort) =>
  [...rows].sort((rowA, rowB) => {
    const a = column.sortValue(rowA);
    const b = column.sortValue(rowB);
    if (a === null || b === null)
      return Number(a === null) - Number(b === null);
    const order = compare(a, b);
    return sort.direction === "asc" ? order : -order;
  });

type ReportTableProps<T> = {
  label: string;
  /** In the order the table opens in, before any header is pressed. */
  rows: T[];
  getKey: (row: T) => string;
  getName: (row: T) => string;
  /** The muted line under the name. */
  getDetail: (row: T) => ReactNode;
  /** Why Needs attention names the row, when it does. */
  getFlag: (row: T) => string | undefined;
  onOpen: (row: T) => void;
  /** The first column's heading, such as "Person" or "Project". */
  nameHeader: string;
  columns: ReportColumn<T>[];
  /** What a row is, for "Show all 37 people". */
  noun: [one: string, many: string];
  /** The row where the card is too narrow for the columns. */
  compact: (row: T) => CompactRow;
};

/** A row where the columns don't fit: its main figure, a short note and the bar. */
export type CompactRow = {
  figure: ReactNode;
  note?: ReactNode;
  bar: ReactNode;
};

/**
 * One of Reports' tables: a row per person or project, its name opening the
 * panel, figures under named columns that sort from their headers, and the
 * first ten rows until the rest are asked for. Where the card is too narrow
 * for the columns (a phone, a tablet, or beside an open panel), each row is
 * the name with its main figure, a short note and the bar.
 */
export const ReportTable = <T,>({
  label,
  rows,
  getKey,
  getName,
  getDetail,
  getFlag,
  onOpen,
  nameHeader,
  columns,
  noun,
  compact,
}: ReportTableProps<T>) => {
  const [sort, setSort] = useState<Sort | null>(null);
  const [showsAll, setShowsAll] = useState(false);

  const nameColumn: ReportColumn<T> = {
    header: nameHeader,
    cell: getName,
    sortValue: getName,
  };
  const sortable = [nameColumn, ...columns];
  const sortColumn = sortable.find((column) => column.header === sort?.column);
  const sorted = sort && sortColumn ? sortRows(rows, sortColumn, sort) : rows;
  const shown = showsAll ? sorted : sorted.slice(0, ROWS_SHOWN);

  const sortBy = (column: ReportColumn<T>) =>
    setSort((current) =>
      current?.column === column.header
        ? {
            column: column.header,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : {
            column: column.header,
            direction: column.numeric ? "desc" : "asc",
          },
    );

  const head = (column: ReportColumn<T>, className?: string) => {
    const isActive = sort?.column === column.header;
    const Icon = !isActive
      ? ChevronsUpDown
      : sort.direction === "asc"
        ? ArrowUp
        : ArrowDown;

    return (
      <TableHead
        key={column.header}
        numeric={column.numeric}
        aria-sort={
          isActive
            ? sort.direction === "asc"
              ? "ascending"
              : "descending"
            : undefined
        }
        className={cn("h-10 py-0", column.width, className)}
      >
        <button
          type="button"
          onClick={() => sortBy(column)}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            isActive && "text-foreground",
          )}
        >
          {column.header}
          <Icon className="size-3" aria-hidden />
        </button>
      </TableHead>
    );
  };

  const name = (row: T) => {
    const flag = getFlag(row);
    return (
      <>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(row)}
            className="line-clamp-2 rounded-sm text-left text-sm font-medium transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {getName(row)}
          </button>
          {flag && <AttentionDot title={flag} />}
        </span>
        <span className="block text-xs font-normal text-muted-foreground">
          {getDetail(row)}
        </span>
      </>
    );
  };

  return (
    <div className="@container">
      <div className="hidden @3xl:block">
        <Table aria-label={label} className="table-fixed">
          <TableHeader>
            {head(nameColumn, "pl-0")}
            {columns.map((column) => head(column))}
          </TableHeader>
          <TableBody>
            {shown.map((row) => (
              <TableRow key={getKey(row)}>
                <TableRowHeader className="py-2.5 pl-0">
                  {name(row)}
                </TableRowHeader>
                {columns.map((column) => (
                  <TableCell
                    key={column.header}
                    numeric={column.numeric}
                    className="py-2.5"
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label={label} className="divide-y divide-border @3xl:hidden">
        {shown.map((row) => {
          const { figure, note, bar } = compact(row);
          return (
            <li key={getKey(row)} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">{name(row)}</div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-sm font-medium whitespace-nowrap">
                    {figure}
                  </p>
                  {note && (
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                      {note}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">{bar}</div>
            </li>
          );
        })}
      </ul>

      {rows.length > ROWS_SHOWN && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-2 h-auto px-0 max-sm:h-auto"
          aria-expanded={showsAll}
          onClick={() => setShowsAll(!showsAll)}
        >
          {showsAll
            ? "Show fewer"
            : `Show all ${countLabel(rows.length, ...noun)}`}
        </Button>
      )}
    </div>
  );
};
