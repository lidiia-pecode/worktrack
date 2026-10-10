"use client";

import type { Choice } from "../entity-panel/use-staged-selection";
import { ImpactDialog } from "../shared/ImpactDialog";

export interface ProjectActivityRemoval {
  projects: Choice[];
  activities: Choice[];
}

interface RemoveProjectActivityDialogProps {
  removal: ProjectActivityRemoval | null;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

// One by name, several by count, as a title reads best.
const names = (choices: Choice[], plural: string) =>
  choices.length === 1 ? choices[0].name : `${choices.length} ${plural}`;

/**
 * From the project's side or the activity's, for one link or several: past
 * time stays either way.
 */
export const RemoveProjectActivityDialog = ({
  removal,
  onConfirm,
  onClose,
  loading = false,
}: RemoveProjectActivityDialogProps) => {
  const activities = removal?.activities ?? [];
  const projects = removal?.projects ?? [];

  return (
    <ImpactDialog
      isOpen={Boolean(removal)}
      title={
        removal
          ? `Remove ${names(activities, "activities")} from ${names(projects, "projects")}?`
          : ""
      }
      description={
        removal
          ? `Nobody can log new time on ${listFormat.format(
              activities.map((activity) => activity.name),
            )} in ${listFormat.format(
              projects.map((project) => project.name),
            )}. Time already logged stays in reports.`
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
