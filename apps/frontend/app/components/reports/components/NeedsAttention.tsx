"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { AttentionFact, AttentionItem } from "@/lib/utils/report-attention";

import { Card } from "@/components/ui/card";

import { ReportCardTitle } from "./ReportCardTitle";
import { DATE_LOCALE } from "@/lib/utils/date";

/**
 * The one mark on Reports: somebody or something named in Needs attention.
 * Without a title it only repeats what the text beside it says.
 */
export const AttentionDot = ({ title }: { title?: string }) => (
  <span
    className="inline-block size-2 shrink-0 rounded-full bg-warning"
    {...(title
      ? { title, role: "img", "aria-label": title }
      : { "aria-hidden": true })}
  />
);

/** What the dot means, under a card's heading while a row in it has one. */
export const AttentionLegend = () => (
  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
    <AttentionDot />
    In Needs attention
  </p>
);

/** People or projects named before the rest open on request. */
const ITEMS_SHOWN = 3;

const MONTH_NAME = new Intl.DateTimeFormat(DATE_LOCALE, { month: "long" });

const NAME_CLASS =
  "rounded-sm underline-offset-2 hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const NameButton = ({
  item,
  onOpen,
}: {
  item: AttentionItem;
  onOpen: (id: string) => void;
}) => (
  <button type="button" className={NAME_CLASS} onClick={() => onOpen(item.id)}>
    {item.label}
  </button>
);

/** Everyone a fact names, the first few at once and the rest on request. */
const ItemList = ({
  items,
  onOpen,
}: {
  items: AttentionItem[];
  onOpen: (id: string) => void;
}) => {
  const [showsAll, setShowsAll] = useState(false);
  const shown = showsAll ? items : items.slice(0, ITEMS_SHOWN);
  const hidden = items.length - shown.length;

  return (
    <p className="text-sm text-muted-foreground">
      {shown.map((item, index) => (
        <span key={item.id}>
          {index > 0 && ", "}
          <NameButton item={item} onOpen={onOpen} />
        </span>
      ))}
      {items.length > ITEMS_SHOWN && (
        <>
          {" "}
          <button
            type="button"
            aria-expanded={showsAll}
            className={cn(NAME_CLASS, "font-medium text-foreground")}
            onClick={() => setShowsAll(!showsAll)}
          >
            {showsAll ? "Show fewer" : `and ${hidden} more`}
          </button>
        </>
      )}
    </p>
  );
};

type OpenMonthLinksProps = {
  /** YYYY-MM, oldest first. */
  months: string[];
  onOpenMonth: (month: string) => void;
};

/**
 * Needs attention reads one month at a time, so a longer period names the
 * months in it still open for edits, each switching to its own.
 */
export const OpenMonthLinks = ({
  months,
  onOpenMonth,
}: OpenMonthLinksProps) => (
  <p className="text-sm text-muted-foreground">
    What needs attention:{" "}
    {months.map((month, index) => (
      <span key={month}>
        {index > 0 && " · "}
        <button
          type="button"
          className={cn(NAME_CLASS, "font-medium text-foreground")}
          onClick={() => onOpenMonth(month)}
        >
          {MONTH_NAME.format(new Date(`${month}-01T00:00:00`))} ›
        </button>
      </span>
    ))}
  </p>
);

type NeedsAttentionProps = {
  facts: AttentionFact[];
  /** The month's first day, for the line when nothing needs attention. */
  month: string;
  /** Whether the month is still running, rather than over and not yet locked. */
  isMonthRunning: boolean;
  onOpenPerson: (userId: string) => void;
  onOpenProject: (projectId: string) => void;
};

/** The open month's problems, one row per kind; each name opens its panel. */
export const NeedsAttention = ({
  facts,
  month,
  isMonthRunning,
  onOpenPerson,
  onOpenProject,
}: NeedsAttentionProps) => {
  const emptyLine = isMonthRunning
    ? "Nothing needs attention so far. Missing time is checked once a week ends."
    : `Nothing needs attention before ${MONTH_NAME.format(new Date(`${month}T00:00:00`))} locks.`;

  return (
    <Card as="section" aria-labelledby="report-attention" className="p-6">
      <ReportCardTitle
        id="report-attention"
        title="Needs attention"
        icon={TriangleAlert}
        tone="warning"
      />

      {facts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLine}</p>
      ) : (
        // Side by side when there are two; one card takes the whole width.
        <ul
          className={cn(
            "mt-4 grid gap-3",
            facts.length > 1 && "@3xl:grid-cols-2",
          )}
        >
          {facts.map((fact) => {
            const onOpen =
              fact.kind === "daysWithoutTime" ? onOpenPerson : onOpenProject;

            return (
              <li
                key={fact.kind}
                className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-subtle px-4 py-3.5"
              >
                {/* One line high, so the dot sits beside the first line. */}
                <span className="flex h-6 items-center">
                  <AttentionDot />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="font-semibold">
                    {fact.subject && (
                      <>
                        <NameButton item={fact.subject} onOpen={onOpen} />{" "}
                      </>
                    )}
                    {fact.headline}
                    {fact.note && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {fact.note}
                      </span>
                    )}
                  </p>
                  {fact.detail && (
                    <p className="text-sm text-muted-foreground">
                      {fact.detail}
                    </p>
                  )}
                  {fact.items.length > 0 && (
                    <ItemList items={fact.items} onOpen={onOpen} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
