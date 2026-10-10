"use client";

import { useState } from "react";

import { useProjectLinks } from "@/hooks/useProjects";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { fullName } from "@/lib/utils/user";
import { Activity, AssignableUser, Project } from "@/types";

import { ImpactDialog } from "../shared/ImpactDialog";

/**
 * Adds and removes a project's people and activities, each saved at once.
 * Removing someone asks first only when it deletes their future plans here;
 * removing an activity always says that past time stays.
 */
export const useProjectLinkChanges = (project: Project) => {
  const links = useProjectLinks(project.id);
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const [removingActivity, setRemovingActivity] = useState<Activity | null>(
    null,
  );

  // A second click while one change saves would act on stale details.
  const isBusy = links.isSaving || isChecking;

  const addMember = (userId: string) => {
    if (!isBusy) links.addMember.mutate(userId);
  };

  const removeMember = (member: AssignableUser) => {
    if (isBusy) return;

    void confirmRemoval({
      projectIds: [project.id],
      userIds: [member.id],
      title: `Remove ${fullName(member)} from ${project.name}?`,
      // A failure is reported by the global mutation handler.
      proceed: () =>
        links.removeMember.mutateAsync(member.id).then(
          () => undefined,
          () => undefined,
        ),
    });
  };

  const addActivity = (activityId: string) => {
    if (!isBusy) links.addActivity.mutate(activityId);
  };

  const removeActivity = (activity: Activity) => {
    if (!isBusy) setRemovingActivity(activity);
  };

  const dialogs = (
    <>
      <ImpactDialog {...confirmProps} />

      <ImpactDialog
        isOpen={Boolean(removingActivity)}
        title={
          removingActivity
            ? `Remove ${removingActivity.name} from ${project.name}?`
            : ""
        }
        description={
          removingActivity
            ? `Nobody can log new time on ${removingActivity.name} in this project. Time already logged stays in reports.`
            : ""
        }
        confirmText="Remove"
        confirmVariant="destructive"
        loading={links.removeActivity.isPending}
        onConfirm={() =>
          removingActivity &&
          links.removeActivity.mutate(removingActivity.id, {
            onSettled: () => setRemovingActivity(null),
          })
        }
        onClose={() => setRemovingActivity(null)}
      />
    </>
  );

  return { addMember, removeMember, addActivity, removeActivity, dialogs };
};
