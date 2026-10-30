"use client";

import { formatLongDayLabel } from "@/lib/utils/date";

import { ImpactDialog } from "../ImpactDialog";

type NonWorkDayConfirmProps = {
  date: Date | null;
  onConfirm: () => void;
  onClose: () => void;
};

export const NonWorkDayConfirm = ({
  date,
  onConfirm,
  onClose,
}: NonWorkDayConfirmProps) => (
  <ImpactDialog
    isOpen={!!date}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Log time on a non-work day?"
    description={
      date
        ? `${formatLongDayLabel(date)} is outside the standard work week.`
        : undefined
    }
    confirmText="Log time"
  />
);
