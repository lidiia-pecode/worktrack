"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";

import { ProjectStatus } from "@/types/enums";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StatusMenuProps = {
  status: ProjectStatus;
  loading?: boolean;
  onArchive?: () => void;
  onRestore?: () => void;
};

const STATUS_META = {
  [ProjectStatus.ACTIVE]: {
    label: "Active",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  [ProjectStatus.ARCHIVED]: {
    label: "Archived",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
};

export const StatusMenu = ({
  status,
  loading,
  onArchive,
  onRestore,
}: StatusMenuProps) => {
  const current = STATUS_META[status];

  const handleSelect = (target: ProjectStatus) => {
    if (target === status || loading) return;

    if (target === ProjectStatus.ARCHIVED) {
      onArchive?.();
      return;
    }

    onRestore?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" disabled={loading} className="rounded-full">
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <span className={`size-2 rounded-full ${current.dot}`} />
          )}

          <span className={current.text}>{current.label}</span>

          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Change status
        </div>

        {(Object.keys(STATUS_META) as ProjectStatus[]).map((key) => {
          const meta = STATUS_META[key];
          const selected = key === status;

          return (
            <DropdownMenuItem
              key={key}
              disabled={selected || loading}
              onClick={() => handleSelect(key)}
              className="p-2"
            >
              <span className={`size-2 rounded-full ${meta.dot}`} />

              <span className="flex-1">{meta.label}</span>

              {selected && <Check className="size-4 text-muted-foreground" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
