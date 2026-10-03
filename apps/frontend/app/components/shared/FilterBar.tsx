"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export const FilterBar = ({ children, className }: FilterBarProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
};
