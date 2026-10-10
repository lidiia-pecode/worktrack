"use client";

import { useState } from "react";

import { useProjectLinks } from "@/hooks/useProjects";
import { ActivityDetails } from "@/types";

import { useStagedSelection } from "../entity-panel/useStagedSelection";
import {
  activeProjectChoices,
  ProjectChoicesPicker,
} from "../projects/ProjectChoicesPicker";
import {
  ProjectActivityRemoval,
  RemoveProjectActivityDialog,
} from "../projects/RemoveProjectActivityDialog";

export const ActivityProjectsPicker = ({
  activity,
}: {
  activity: ActivityDetails;
}) => {
  const links = useProjectLinks();
  const [removal, setRemoval] = useState<ProjectActivityRemoval | null>(null);
  const staged = useStagedSelection(
    activeProjectChoices(activity.projects ?? []),
  );

  const applyAll = () =>
    staged.apply([
      ...staged.toAdd.map((project) =>
        links.addActivity.mutateAsync({
          projectId: project.id,
          activityId: activity.id,
        }),
      ),
      ...staged.toRemove.map((project) =>
        links.removeActivity.mutateAsync({
          projectId: project.id,
          activityId: activity.id,
        }),
      ),
    ]);

  const done = () => {
    if (staged.toRemove.length > 0) {
      setRemoval({ projects: staged.toRemove, activities: [activity] });
    } else {
      void applyAll();
    }
  };

  return (
    <>
      <ProjectChoicesPicker
        title={`Add ${activity.name} to projects`}
        description="People on these projects can log time on it. Choose them, then Done; choose one again to take it off."
        staged={staged}
        isApplying={staged.isApplying}
        onDone={done}
      />

      <RemoveProjectActivityDialog
        removal={removal}
        loading={staged.isApplying}
        onConfirm={() => {
          setRemoval(null);
          void applyAll();
        }}
        onClose={() => setRemoval(null)}
      />
    </>
  );
};
