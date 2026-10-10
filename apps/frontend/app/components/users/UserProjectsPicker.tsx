"use client";

import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { useProjectLinks } from "@/hooks/useProjects";
import { nameOrCount } from "@/lib/utils/text";
import { fullName } from "@/lib/utils/user";
import { UserDetails } from "@/types";

import { useStagedSelection } from "../entity-panel/useStagedSelection";
import {
  activeProjectChoices,
  ProjectChoicesPicker,
} from "../projects/ProjectChoicesPicker";
import { ImpactDialog } from "../shared/ImpactDialog";

export const UserProjectsPicker = ({ user }: { user: UserDetails }) => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const staged = useStagedSelection(activeProjectChoices(user.projects));
  const userId = user.id;

  // Taking them off a project deletes their future plans there.
  const done = () =>
    void confirmRemoval({
      projectIds: staged.toRemove.map((project) => project.id),
      userIds: [userId],
      title: `Remove ${fullName(user)} from ${nameOrCount(
        staged.toRemove.map((project) => project.name),
        "projects",
      )}?`,
      proceed: () =>
        staged.apply([
          ...staged.toAdd.map((project) =>
            links.addMember.mutateAsync({ projectId: project.id, userId }),
          ),
          ...staged.toRemove.map((project) =>
            links.removeMember.mutateAsync({ projectId: project.id, userId }),
          ),
        ]),
    });

  return (
    <>
      <ProjectChoicesPicker
        title={`Add ${fullName(user)} to projects`}
        description="They can log time on these projects. Choose them, then Done; choose one again to take them off."
        staged={staged}
        isApplying={staged.isApplying || isChecking}
        onDone={done}
      />

      <ImpactDialog {...confirmProps} />
    </>
  );
};
