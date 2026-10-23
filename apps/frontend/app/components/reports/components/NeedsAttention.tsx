"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { AttentionFact } from "@/lib/utils/report-attention";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { PERSON_PARAM } from "../../team/useOpenedPerson";
import { AttentionDot } from "./ReportRow";

type NeedsAttentionProps = {
  facts: AttentionFact[];
  onOpenPerson: (userId: string) => void;
  onOpenProject: (projectId: string) => void;
  onSeePeople: () => void;
  onSeeProjects: () => void;
};

// The action sits flush under the text, a link or a button alike.
const ACTION_CLASS = "h-auto self-start px-0";

/** The month's problems, one card per kind, each with where to act on it. */
export const NeedsAttention = ({
  facts,
  onOpenPerson,
  onOpenProject,
  onSeePeople,
  onSeeProjects,
}: NeedsAttentionProps) => {
  const action = ({ kind, subjectId, headline }: AttentionFact) => {
    if (kind === "daysWithoutTime") {
      return (
        <Link
          href={subjectId ? `/team?${PERSON_PARAM}=${subjectId}` : "/team"}
          className={cn(
            buttonVariants({ variant: "link", size: "sm" }),
            ACTION_CLASS,
          )}
          aria-label={`Open in Team time: ${headline}`}
        >
          Open in Team time
        </Link>
      );
    }

    const isPerson = kind === "plannedBeyondHours";
    const label = subjectId
      ? isPerson
        ? "Open person"
        : "Open project"
      : isPerson
        ? "See people"
        : "See projects";
    const onClick = () => {
      if (!subjectId) return isPerson ? onSeePeople() : onSeeProjects();
      return isPerson ? onOpenPerson(subjectId) : onOpenProject(subjectId);
    };

    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        className={ACTION_CLASS}
        aria-label={`${label}: ${headline}`}
        onClick={onClick}
      >
        {label}
      </Button>
    );
  };

  return (
    <Card as="section" aria-labelledby="report-attention" className="p-6">
      <h2 id="report-attention" className="text-base font-semibold">
        Needs attention
      </h2>

      {facts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing needs attention this month.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 @3xl:grid-cols-3">
          {facts.map((fact) => (
            <li
              key={fact.kind}
              className="flex flex-col gap-1.5 rounded-xl border border-warning/25 bg-warning/8 px-4 py-3.5"
            >
              <p className="flex items-start gap-2 font-semibold">
                {/* One line high, so the dot sits beside the first line. */}
                <span className="flex h-6 items-center">
                  <AttentionDot />
                </span>
                {fact.headline}
              </p>
              <p className="text-sm text-muted-foreground">{fact.detail}</p>
              {action(fact)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
