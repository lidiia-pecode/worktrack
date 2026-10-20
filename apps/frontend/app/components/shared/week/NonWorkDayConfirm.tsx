"use client";

import { formatLongDayLabel } from "@/lib/utils/date";

import { ConfirmModal } from "../ConfirmModal";

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
  <ConfirmModal
    isOpen={!!date}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Log time on a non-work day?"
    message={
      date
        ? `${formatLongDayLabel(date)} is outside the standard work week.`
        : undefined
    }
    confirmText="Log time"
  />
);
