"use client";

import { useState } from "react";

import { useProjectLinks } from "@/hooks/useProjects";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { fullName } from "@/lib/utils/user";
import { Activity, AssignableUser, Project } from "@/types";

import { ImpactDialog } from "../shared/ImpactDialog";
import {
  ProjectActivityRemoval,
  RemoveProjectActivityDialog,
} from "./RemoveProjectActivityDialog";

/**
 * Adds and removes a project's people and activities, each saved at once.
 * Removing someone asks first only when it deletes their future plans here;
 * removing an activity always says that past time stays.
 */
export const useProjectLinkChanges = (project: Project) => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const [activityRemoval, setActivityRemoval] =
    useState<ProjectActivityRemoval | null>(null);

  // A second click while one change saves would act on stale details.
  const isBusy = links.isSaving || isChecking;
  const projectId = project.id;

  const addMember = (userId: string) => {
    if (!isBusy) links.addMember.mutate({ projectId, userId });
  };

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

  const addActivity = (activityId: string) => {
    if (!isBusy) links.addActivity.mutate({ projectId, activityId });
  };

  const removeActivity = (activity: Activity) => {
    if (!isBusy) setActivityRemoval({ project, activity });
  };

  const dialogs = (
    <>
      <ImpactDialog {...confirmProps} />

      <RemoveProjectActivityDialog
        removal={activityRemoval}
        onClose={() => setActivityRemoval(null)}
      />
    </>
  );

  return { addMember, removeMember, addActivity, removeActivity, dialogs };
};
