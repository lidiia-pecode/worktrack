"use client";

import { listNames, nameOrCount } from "@/lib/utils/text";

import type { Choice } from "../entity-panel/useStagedSelection";
import { ImpactDialog } from "../shared/ImpactDialog";

export interface ProjectActivityRemoval {
  projects: Choice[];
  activities: Choice[];
}

interface RemoveProjectActivityDialogProps {
  removal: ProjectActivityRemoval | null;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

const namesOf = (choices: Choice[]) => choices.map((choice) => choice.name);

export const RemoveProjectActivityDialog = ({
  removal,
  onConfirm,
  onClose,
  loading,
}: RemoveProjectActivityDialogProps) => {
  const activities = removal?.activities ?? [];
  const projects = removal?.projects ?? [];

  return (
    <ImpactDialog
      isOpen={Boolean(removal)}
      title={
        removal
          ? `Remove ${nameOrCount(namesOf(activities), "activities")} from ${nameOrCount(namesOf(projects), "projects")}?`
          : ""
      }
      description={
        removal
          ? `Nobody can log new time on ${listNames(namesOf(activities))} in ${listNames(namesOf(projects))}. Time already logged stays in reports.`
          : ""
      }
      confirmText="Remove"
      confirmVariant="destructive"
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
