"use client";

import { useState } from "react";

import { useProjectLinks } from "@/hooks/useProjects";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";

import type { Choice } from "../entity-panel/useStagedSelection";
import { ImpactDialog } from "../shared/ImpactDialog";
import {
  ProjectActivityRemoval,
  RemoveProjectActivityDialog,
} from "./RemoveProjectActivityDialog";

/** Removes one person or activity from a project, from its row in any panel. */
export const useProjectLinkChanges = () => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const [activityRemoval, setActivityRemoval] =
    useState<ProjectActivityRemoval | null>(null);

  // A second click while one change saves would act on stale details.
  const isBusy = links.isSaving || isChecking;

  const removeMember = (project: Choice, person: Choice) => {
    if (isBusy) return;

    void confirmRemoval({
      projectIds: [project.id],
      userIds: [person.id],
      title: `Remove ${person.name} from ${project.name}?`,
      // The global mutation handler reports a failure.
      proceed: () =>
        links.removeMember
          .mutateAsync({ projectId: project.id, userId: person.id })
          .then(
            () => undefined,
            () => undefined,
          ),
    });
  };

  const removeActivity = (project: Choice, activity: Choice) => {
    if (!isBusy) {
      setActivityRemoval({ projects: [project], activities: [activity] });
    }
  };

  const confirmActivityRemoval = () => {
    if (!activityRemoval) return;

    links.removeActivity.mutate(
      {
        projectId: activityRemoval.projects[0].id,
        activityId: activityRemoval.activities[0].id,
      },
      { onSettled: () => setActivityRemoval(null) },
    );
  };

  const dialogs = (
    <>
      <ImpactDialog {...confirmProps} />

      <RemoveProjectActivityDialog
        removal={activityRemoval}
        loading={links.removeActivity.isPending}
        onConfirm={confirmActivityRemoval}
        onClose={() => setActivityRemoval(null)}
      />
    </>
  );

  return { removeMember, removeActivity, dialogs };
};
