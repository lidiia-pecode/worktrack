"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/auth/useAuth";
import { useActivitiesInfiniteQuery } from "@/hooks/useActivities";
import { useServerSearch } from "@/hooks/useManageListState";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { useProjectLinks } from "@/hooks/useProjects";
import { useIsOnboarding } from "@/hooks/useSetupLink";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { initials, fullName } from "@/lib/utils/user";
import { Activity, Project } from "@/types";
import { ActivityStatus, UserRole, UserStatus } from "@/types/enums";

import { ActivityCreateDialog } from "../activities/ActivityCreateDialog";
import { PanelView } from "../entity-panel/EntityPanelLayout";
import { useStagedSelection } from "../entity-panel/use-staged-selection";
import { ImpactDialog } from "../shared/ImpactDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { InviteHint } from "../users/InviteHint";
import {
  ProjectActivityRemoval,
  RemoveProjectActivityDialog,
} from "./RemoveProjectActivityDialog";

export const PEOPLE_PICKER = "add-people";

export const ACTIVITIES_PICKER = "add-activities";

// From the setup checklist, adding is the step, so Done returns to it.
const useSetupDone = () => {
  const router = useRouter();
  const isOnboarding = useIsOnboarding();

  return isOnboarding
    ? {
        label: "Back to Getting started",
        afterwards: () => router.push(GETTING_STARTED_PATH),
      }
    : undefined;
};

/** Offered activities, which a project's details list with their category. */
export const offeredActivities = (project: Project): Activity[] =>
  (project.projectActivities ?? [])
    .map((projectActivity) => projectActivity.activity)
    .filter((activity): activity is Activity => Boolean(activity));

const peopleCount = (count: number) =>
  `${count} ${count === 1 ? "person" : "people"}`;

export const ProjectPeoplePicker = ({ project }: { project: Project }) => {
  const { user } = useAuth();
  const setupDone = useSetupDone();
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useAssignableUsersInfiniteQuery(
    { status: UserStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );

  const staged = useStagedSelection(
    (project.users ?? []).map((member) => ({
      id: member.id,
      name: fullName(member),
    })),
  );
  const projectId = project.id;

  const toggle = (userId: string) => {
    const person = items.find((item) => item.id === userId);
    if (person) staged.toggle({ id: person.id, name: fullName(person) });
  };

  // Taking someone off deletes their future plans here, so Done asks first
  // only when there are some.
  const done = () => {
    const removedIds = staged.toRemove.map((member) => member.id);

    void confirmRemoval({
      projectIds: removedIds.length > 0 ? [projectId] : [],
      userIds: removedIds,
      title:
        staged.toRemove.length === 1
          ? `Remove ${staged.toRemove[0].name} from ${project.name}?`
          : `Remove ${peopleCount(staged.toRemove.length)} from ${project.name}?`,
      proceed: () =>
        staged.apply(
          [
            ...staged.toAdd.map((person) =>
              links.addMember.mutateAsync({ projectId, userId: person.id }),
            ),
            ...removedIds.map((userId) =>
              links.removeMember.mutateAsync({ projectId, userId }),
            ),
          ],
          setupDone?.afterwards,
        ),
    });
  };

  return (
    <>
      <PanelView
        title={`Add people to ${project.name}`}
        description={
          <>
            {user?.role === UserRole.OWNER
              ? "Choose who works on it, then Done. Choose someone again to take them off."
              : "You can add yourself and people in teams you manage. Choose who works on it, then Done."}{" "}
            <InviteHint />
          </>
        }
        pendingCount={staged.pendingCount}
        isApplying={staged.isApplying || isChecking}
        onDone={done}
        doneLabel={setupDone?.label}
        onCancel={staged.cancel}
      >
        <EntityPicker
          items={items}
          selectedIds={staged.selectedIds}
          onToggle={toggle}
          getId={(person) => person.id}
          getLabel={fullName}
          getSubtitle={(person) => person.email}
          getAvatarText={initials}
          onSearchChange={setSearch}
          isLoading={isLoading}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onFetchNextPage={pagination.fetchNextPage}
          emptyMessage="Nobody to add yet."
          searchPlaceholder="Search people..."
        />
      </PanelView>

      <ImpactDialog {...confirmProps} />
    </>
  );
};

export const ProjectActivitiesPicker = ({ project }: { project: Project }) => {
  const setupDone = useSetupDone();
  const links = useProjectLinks();
  const [isCreating, setIsCreating] = useState(false);
  const [removal, setRemoval] = useState<ProjectActivityRemoval | null>(null);
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useActivitiesInfiniteQuery(
    { status: ActivityStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );

  const staged = useStagedSelection(
    offeredActivities(project).map(({ id, name }) => ({ id, name })),
  );
  const projectId = project.id;

  const toggle = (activityId: string) => {
    const activity = items.find((item) => item.id === activityId);
    // A draft has no category, so a project cannot offer it yet.
    if (activity?.category) {
      staged.toggle({ id: activity.id, name: activity.name });
    }
  };

  const applyAll = () =>
    staged.apply(
      [
        ...staged.toAdd.map((activity) =>
          links.addActivity.mutateAsync({
            projectId,
            activityId: activity.id,
          }),
        ),
        ...staged.toRemove.map((activity) =>
          links.removeActivity.mutateAsync({
            projectId,
            activityId: activity.id,
          }),
        ),
      ],
      setupDone?.afterwards,
    );

  // Taking an activity off always says that past time stays.
  const done = () => {
    if (staged.toRemove.length > 0) {
      setRemoval({ projects: [project], activities: staged.toRemove });
      return;
    }

    void applyAll();
  };

  return (
    <>
      <PanelView
        title={`Add activities to ${project.name}`}
        description="People on the project log time against these. Choose them, then Done; choose one again to take it off."
        create={{ label: "New activity", onClick: () => setIsCreating(true) }}
        pendingCount={staged.pendingCount}
        isApplying={staged.isApplying}
        onDone={done}
        doneLabel={setupDone?.label}
        onCancel={staged.cancel}
      >
        <EntityPicker
          items={items}
          selectedIds={staged.selectedIds}
          onToggle={toggle}
          getId={(activity) => activity.id}
          getLabel={(activity) => activity.name}
          getSubtitle={(activity) =>
            activity.category?.name ?? "No category, so it can't be added yet"
          }
          isDisabled={(activity) => !activity.category}
          onSearchChange={setSearch}
          isLoading={isLoading}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onFetchNextPage={pagination.fetchNextPage}
          emptyMessage="No activities yet. Make the first with New activity."
          searchPlaceholder="Search activities..."
        />
      </PanelView>

      {/* A new activity joins the choices, applied with them on Done. */}
      <ActivityCreateDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        requiresCategory
        onCreated={(activity) =>
          staged.select({ id: activity.id, name: activity.name })
        }
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
