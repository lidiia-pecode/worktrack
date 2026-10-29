"use client";

import {
  useProjectArchiveImpact,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { countLabel } from "@/lib/utils/text";
import { fullName } from "@/lib/utils/user";
import { Project } from "@/types";

import { ImpactDialog } from "../shared/ImpactDialog";

interface ProjectArchiveDialogProps {
  /** The dialog is open while this is set. */
  project: Project | null;
  onClose: () => void;
}

const LOCKS_IT = "Nobody can log or plan time on it, and it can't be changed.";

/** Archiving removes the project's plans from today on, so the dialog names whose first. */
export const ProjectArchiveDialog = ({
  project,
  onClose,
}: ProjectArchiveDialogProps) => {
  const { archive } = useProjectsMutations();
  const impact = useProjectArchiveImpact(project?.id ?? "", Boolean(project));
  const planCount = impact.data?.planCount ?? 0;

  const confirm = () => {
    if (!project) return;

    archive.mutate(project.id, {
      onSuccess: onClose,
    });
  };

  const description = impact.isError
    ? "Could not check its plans. Close this and try again."
    : !impact.data
      ? "Checking its plans..."
      : planCount === 0
        ? `${LOCKS_IT} Its people and activities are kept, and restoring it brings them back.`
        : `${LOCKS_IT} Its ${countLabel(planCount, "planned entry", "planned entries")} from today on are removed; past plans stay. Its people and activities are kept, and restoring it brings them back, but not the removed plans.`;

  return (
    <ImpactDialog
      isOpen={Boolean(project)}
      title={project ? `Archive ${project.name}?` : ""}
      description={description}
      affected={[
        {
          label: "Plans removed for",
          entities: (impact.data?.people ?? []).map((person) => ({
            entity: { type: "user" as const, id: person.id },
            name: fullName(person),
          })),
        },
      ]}
      confirmText="Archive"
      confirmVariant="destructive"
      onConfirm={confirm}
      onClose={onClose}
      loading={archive.isPending}
      // A cached impact may be out of date until the check on opening returns.
      confirmDisabled={!impact.data || impact.isFetching}
    />
  );
};
