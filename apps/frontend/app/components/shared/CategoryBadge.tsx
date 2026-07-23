"use client";

import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryBadgeProps = {
  name: string;
  className?: string;
};

export function CategoryBadge({ name, className }: CategoryBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        "rounded-lg",
        "bg-lime-300/20",
        "px-3 py-1.5",
        "text-xs font-semibold",
        "text-zinc-700",
        className,
      )}
    >
      <div className="flex h-5 w-5 items-center justify-center rounded bg-white shadow-sm">
        <Tag size={11} className="text-zinc-500" />
      </div>

      <span>{name}</span>
    </div>
  );
}
