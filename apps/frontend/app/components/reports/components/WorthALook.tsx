import Link from "next/link";
import { CalendarX2, FolderKanban, LucideIcon, UserRound } from "lucide-react";

import { AttentionItem, AttentionKind } from "@/lib/utils/report-attention";

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

/** The few facts of the period worth a look, each with where to act on it. */
export const WorthALook = ({
  items,
  onOpenPerson,
  onOpenProject,
}: WorthALookProps) => {
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
        <p className="text-xs text-muted-foreground">
          Facts from this period, largest first
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing stands out in this period.
        </p>
      ) : (
        <ul className="mt-2">
          {items.map((item) => {
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
    </Card>
  );
};
