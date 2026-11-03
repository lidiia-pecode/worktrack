import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const TONES = {
  brand: "bg-brand-subtle text-brand",
  warning: "bg-warning-subtle text-warning-text",
};

type ReportCardTitleProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  /** Lines under the title, such as what the card measures. */
  children?: ReactNode;
};

/** A Reports card's heading: its icon in a tinted square, as `CardHeader` has it. */
export const ReportCardTitle = ({
  id,
  title,
  icon: Icon,
  tone = "brand",
  children,
}: ReportCardTitleProps) => (
  <div className="flex items-start gap-3">
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        TONES[tone],
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
    <div className="min-w-0">
      <h2 id={id} className="text-base leading-8 font-semibold">
        {title}
      </h2>
      {children}
    </div>
  </div>
);
