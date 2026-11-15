import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const TONES = {
  neutral: "text-muted-foreground",
  warning: "text-warning-text",
};

type ReportCardTitleProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  /** Lines under the title, such as what the card measures. */
  children?: ReactNode;
};

/** A Reports card's heading: its icon bare beside the title, as `CardHeader` has it. */
export const ReportCardTitle = ({
  id,
  title,
  icon: Icon,
  tone = "neutral",
  children,
}: ReportCardTitleProps) => (
  <div className="flex items-start gap-3">
    <Icon className={cn("mt-1.5 size-5 shrink-0", TONES[tone])} aria-hidden />
    <div className="min-w-0">
      <h2 id={id} className="text-base leading-8 font-semibold">
        {title}
      </h2>
      {children}
    </div>
  </div>
);
