"use client";

import { useState } from "react";

import { useProjectLinks } from "@/hooks/useProjects";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { fullName } from "@/lib/utils/user";
import { Activity, AssignableUser, Project } from "@/types";

import { ImpactDialog } from "../shared/ImpactDialog";
import { RemoveProjectActivityDialog } from "./RemoveProjectActivityDialog";

/**
 * Removing one person or activity from its row on the project, saved at once.
 * Removing someone asks first only when it deletes their future plans here;
 * removing an activity always says that past time stays.
 */
export const useProjectLinkChanges = (project: Project) => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const [removingActivity, setRemovingActivity] = useState<Activity | null>(
    null,
  );

  // A second click while one change saves would act on stale details.
  const isBusy = links.isSaving || isChecking;
  const projectId = project.id;

  const removeMember = (member: AssignableUser) => {
    if (isBusy) return;

    void confirmRemoval({
      projectIds: [projectId],
      userIds: [member.id],
      title: `Remove ${fullName(member)} from ${project.name}?`,
      // A failure is reported by the global mutation handler.
      proceed: () =>
        links.removeMember.mutateAsync({ projectId, userId: member.id }).then(
          () => undefined,
          () => undefined,
        ),
    });
  };

  const removeActivity = (activity: Activity) => {
    if (!isBusy) setRemovingActivity(activity);
  };

  const dialogs = (
    <>
      <ImpactDialog {...confirmProps} />

      <RemoveProjectActivityDialog
        removal={
          removingActivity && {
            projects: [project],
            activities: [removingActivity],
          }
        }
        loading={links.removeActivity.isPending}
        onConfirm={() =>
          removingActivity &&
          links.removeActivity.mutate(
            { projectId, activityId: removingActivity.id },
            { onSettled: () => setRemovingActivity(null) },
          )
        }
        onClose={() => setRemovingActivity(null)}
      />
    </>
  );

  return { removeMember, removeActivity, dialogs };
};
