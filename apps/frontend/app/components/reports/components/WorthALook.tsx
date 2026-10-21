"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  CalendarX2,
  ChevronDown,
  FolderKanban,
  LucideIcon,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  ATTENTION_SHOWN_AT_FIRST,
  AttentionItem,
  AttentionKind,
} from "@/lib/utils/report-attention";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { PERSON_PARAM } from "../../team/useOpenedPerson";

const ICONS: Record<AttentionKind, LucideIcon> = {
  projectOffPlan: FolderKanban,
  projectWithoutPlan: FolderKanban,
  plannedBeyondExpected: UserRound,
  daysWithoutTime: CalendarX2,
  teamDaysWithoutTime: CalendarX2,
};

type WorthALookProps = {
  items: AttentionItem[];
  onOpenPerson: (userId: string) => void;
  onOpenProject: (projectId: string) => void;
};

/** The period's facts worth a look, largest first, each with where to act on it. */
export const WorthALook = ({
  items,
  onOpenPerson,
  onOpenProject,
}: WorthALookProps) => {
  const listId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const hidden = items.length - ATTENTION_SHOWN_AT_FIRST;
  const shown = isExpanded ? items : items.slice(0, ATTENTION_SHOWN_AT_FIRST);

  const action = (item: AttentionItem) => {
    if (
      item.kind === "daysWithoutTime" ||
      item.kind === "teamDaysWithoutTime"
    ) {
      return (
        <Link
          href={
            item.subjectId ? `/team?${PERSON_PARAM}=${item.subjectId}` : "/team"
          }
          className={buttonVariants({
            variant: "link",
            size: "sm",
            className: "shrink-0",
          })}
          aria-label={`Open in Team time: ${item.who}`}
        >
          Open in Team time
        </Link>
      );
    }

    const isPerson = item.kind === "plannedBeyondExpected";
    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        className="shrink-0"
        aria-label={`${isPerson ? "Open details" : "See who"}: ${item.who}`}
        onClick={() =>
          isPerson
            ? onOpenPerson(item.subjectId)
            : onOpenProject(item.subjectId)
        }
      >
        {isPerson ? "Open details" : "See who"}
      </Button>
    );
  };

  return (
    <Card as="section" aria-labelledby="report-worth-a-look" className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="report-worth-a-look" className="text-base font-semibold">
          Worth a look
        </h2>
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "fact" : "facts"} from this
            period, largest first
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing stands out in this period.
        </p>
      ) : (
        <ul id={listId} className="mt-2">
          {shown.map((item) => {
            const Icon = ICONS[item.kind];

            return (
              <li
                key={`${item.kind}-${item.subjectId}`}
                className="flex items-center gap-3 border-t border-border/60 py-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{item.who}</span>{" "}
                    {item.what}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.why}</p>
                </div>
                {action(item)}
              </li>
            );
          })}
        </ul>
      )}

      {hidden > 0 && (
        <div className="border-t border-border/60 pt-2">
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls={listId}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : `Show ${hidden} more`}
            <ChevronDown
              className={cn("transition-transform", isExpanded && "rotate-180")}
              aria-hidden
            />
          </Button>
        </div>
      )}
    </Card>
  );
};
