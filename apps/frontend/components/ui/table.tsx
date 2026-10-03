import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Scrolls sideways on a narrow screen; give it a `min-w-*` that fits its columns. */
export const Table = ({ className, ...props }: ComponentProps<"table">) => (
  <div className="overflow-x-auto">
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  </div>
);

/** The one header row; its children are `TableHead` cells. */
export const TableHeader = ({ children }: { children: ReactNode }) => (
  <thead>
    <tr className="border-b border-border bg-muted/10">{children}</tr>
  </thead>
);

export const TableBody = (props: ComponentProps<"tbody">) => (
  <tbody {...props} />
);

/** The one totals row, set apart by a heavier border. */
export const TableFooter = ({ children }: { children: ReactNode }) => (
  <tfoot>
    <tr className="border-t-2 border-border bg-muted/10">{children}</tr>
  </tfoot>
);

export const TableRow = ({ className, ...props }: ComponentProps<"tr">) => (
  <tr
    className={cn("border-b border-border last:border-b-0", className)}
    {...props}
  />
);

interface TableHeadProps extends ComponentProps<"th"> {
  numeric?: boolean;
  /** A second, quieter line, such as what a figure is measured against. */
  detail?: ReactNode;
}

export const TableHead = ({
  numeric = false,
  detail,
  className,
  children,
  ...props
}: TableHeadProps) => (
  <th
    scope="col"
    className={cn(
      "p-3 text-2xs font-medium uppercase tracking-wider text-muted-foreground",
      numeric ? "text-right" : "text-left",
      className,
    )}
    {...props}
  >
    {detail ? (
      <>
        <span className="block">{children}</span>
        <span className="block font-normal normal-case tracking-normal">
          {detail}
        </span>
      </>
    ) : (
      children
    )}
  </th>
);

interface TableRowHeaderProps extends ComponentProps<"th"> {
  /** A second line under the row's name, such as a position or a client. */
  detail?: ReactNode;
}

/** The cell that names its row, such as a person or a project. */
export const TableRowHeader = ({
  detail,
  className,
  children,
  ...props
}: TableRowHeaderProps) => (
  <th
    scope="row"
    className={cn("p-3 text-left font-medium text-foreground", className)}
    {...props}
  >
    {children}

    {detail && (
      <span className="block text-xs font-normal text-muted-foreground">
        {detail}
      </span>
    )}
  </th>
);

interface TableCellProps extends ComponentProps<"td"> {
  numeric?: boolean;
}

export const TableCell = ({
  numeric = false,
  className,
  ...props
}: TableCellProps) => (
  <td
    className={cn("p-3", numeric && "text-right tabular-nums", className)}
    {...props}
  />
);
