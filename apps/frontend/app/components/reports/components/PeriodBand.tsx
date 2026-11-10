import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { BrandPattern } from "@/components/ui/brand-pattern";

type PeriodBandProps = {
  titleId: string;
  /** What the figures cover: "October 2026", or "Nov 1 - Nov 9 so far". */
  label: string;
  children: ReactNode;
};

/**
 * The patterned band at the top of an overview, Reports and Review my time:
 * the period as a badge, its headline figures under it. The brand pattern
 * marks overview moments only, never the screens people work in all day.
 */
export const PeriodBand = ({ titleId, label, children }: PeriodBandProps) => (
  <div className="relative overflow-hidden border-b border-brand-strong bg-brand-muted px-6 pt-5 pb-6">
    <BrandPattern className="opacity-50" />

    <h2 id={titleId} className="relative">
      <Badge variant="solid" className="px-3 py-1 text-sm font-semibold">
        {label}
      </Badge>
    </h2>

    <div className="relative mt-4">{children}</div>
  </div>
);
