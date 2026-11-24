"use client";

import { Lock } from "lucide-react";

import { Absence } from "@/types";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { Button } from "@/components/ui/button";

import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";
import { ChangedByNote } from "./ChangedByNote";

/** Why an absence opens to be read only, by default a locked month. */
export const ABSENCE_IN_LOCKED_MONTH =
  "It's in a locked month, so it can no longer be changed.";
/** For an absence the viewer can't change because some of its days are another team's. */
export const absenceInAnotherTeam = (subjectName: string) =>
  `This absence includes days in another team. ${subjectName} or your company owner can change it.`;

type LockedAbsenceModalProps = {
  absence: Absence;
  subjectName?: string;
  reason?: string;
  onClose: () => void;
};

/** An absence the viewer can only read in full: nothing about it can change. */
export const LockedAbsenceModal = ({
  absence,
  subjectName,
  reason = ABSENCE_IN_LOCKED_MONTH,
  onClose,
}: LockedAbsenceModalProps) => (
  <ResourceFormModal
    open
    onClose={onClose}
    title="Absence"
    description={[subjectName, formatAbsenceRange(absence)]
      .filter(Boolean)
      .join(" · ")}
    footer={
      <Button type="button" variant="outline" size="sm" onClick={onClose}>
        Close
      </Button>
    }
  >
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
      <div>
        <dt className="text-xs text-muted-foreground">Reason</dt>
        <dd className="mt-1 text-sm text-foreground">
          {ABSENCE_TYPE_LABELS[absence.type]}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Days</dt>
        <dd className="mt-1 text-sm text-foreground">
          {formatAbsenceRange(absence)}
        </dd>
      </div>
      {absence.note && (
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Note</dt>
          <dd className="mt-1 text-sm break-words whitespace-pre-line text-foreground">
            {absence.note}
          </dd>
        </div>
      )}
    </dl>

    <ChangedByNote record={absence} className="mt-6" />

    <p className="mt-6 flex gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      {reason}
    </p>
  </ResourceFormModal>
);
