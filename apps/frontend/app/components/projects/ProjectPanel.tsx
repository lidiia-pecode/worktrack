"use client";

import { FolderTree, Plus, UserPlus } from "lucide-react";

import { StatusText } from "../shared/StatusText";
import {
  useClientNameSuggestions,
  useProjectDetails,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { factsLine } from "@/lib/utils/text";
import { fullName, isDeactivatedUser, leaverLabel } from "@/lib/utils/user";
import { Project } from "@/types";
import { countLabel } from "@/lib/utils/text";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelEditForm,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import { Avatar } from "../shared/Avatar";
import { ProjectColorDot } from "../shared/ProjectColorDot";
import { DescriptionView } from "./DescriptionEditor";
import { ProjectForm, ProjectFormData } from "./ProjectForm";
import {
  ACTIVITIES_PICKER,
  offeredActivities,
  PEOPLE_PICKER,
  ProjectActivitiesPicker,
  ProjectPeoplePicker,
} from "./ProjectPickers";
import { isActiveProject, useProjectActions } from "./useProjectActions";
import { useProjectLinkChanges } from "./useProjectLinkChanges";

const EDIT_FORM_ID = "project-edit-form";

const ProjectEditForm = ({ project }: { project: Project }) => {
  const panel = useEntityPanel();
  const { update } = useProjectsMutations();
  const clientSuggestions = useClientNameSuggestions();

  const save = (data: ProjectFormData) =>
    update.mutateAsync(
      { id: project.id, data },
      { onSuccess: panel.stopEditing },
    );

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <ProjectForm
        formId={EDIT_FORM_ID}
        mode="edit"
        defaultValues={{
          name: project.name,
          clientName: project.clientName,
          description: project.description ?? "",
        }}
        clientSuggestions={clientSuggestions}
        onSubmit={save}
        isSubmitting={update.isPending}
        onDirtyChange={panel.setHasUnsavedChanges}
      />
    </PanelEditForm>
  );
};

const ProjectDetails = ({ project }: { project: Project }) => {
  const panel = useEntityPanel();
  const projectActions = useProjectActions();
  const changes = useProjectLinkChanges();

  const isActive = isActiveProject(project);
  // Archiving it from its row ends an open edit.
  const isEditing = panel.isEditing && isActive;
  const canChangeLinks = isActive && !isEditing;

  const members = project.users ?? [];
  const hiddenCount = Math.max((project.membersCount ?? 0) - members.length, 0);
  // Sorted by category, then name, for the grouped list.
  const activities = offeredActivities(project).sort(
    (first, second) =>
      first.category.name.localeCompare(second.category.name) ||
      first.name.localeCompare(second.name),
  );

  const archivedActivities = project.archivedActivities ?? [];

  if (isActive && panel.view === PEOPLE_PICKER) {
    return <ProjectPeoplePicker project={project} />;
  }

  if (isActive && panel.view === ACTIVITIES_PICKER) {
    return <ProjectActivitiesPicker project={project} />;
  }

  return (
    <>
      <EntityPanelLayout
        type="Project"
        name={project.name}
        leading={<ProjectColorDot projectId={project.id} className="size-3" />}
        status={!isActive && <PanelStatus />}
        onEdit={
          projectActions.canEdit(project)
            ? () => projectActions.edit(project)
            : undefined
        }
        actions={projectActions.actionsFor(project)}
        details={[
          {
            label: "Client",
            value: project.clientName || (
              <span className="text-muted-foreground">Internal project</span>
            ),
          },
          ...(project.description
            ? [
                {
                  label: "Description",
                  value: <DescriptionView value={project.description} />,
                  wide: true,
                },
              ]
            : []),
        ]}
        editForm={isEditing && <ProjectEditForm project={project} />}
        editsName
      >
        <PanelList
          title="People"
          items={members}
          getKey={(member) => member.id}
          // A manager sees only the people they manage; the count is everyone.
          note={
            members.length > 0 && hiddenCount > 0
              ? `${countLabel(hiddenCount, "more person", "more people")} you don't manage.`
              : undefined
          }
          renderRow={(member) => ({
            entity: { type: "user", id: member.id },
            name: fullName(member),
            leading: <Avatar user={member} />,
            detail: factsLine([member.position, leaverLabel(member)]),
            isInactive: isDeactivatedUser(member),
            remove: canChangeLinks
              ? {
                  label: `Remove ${fullName(member)} from ${project.name}`,
                  onClick: () =>
                    changes.removeMember(project, {
                      id: member.id,
                      name: fullName(member),
                    }),
                }
              : undefined,
          })}
          emptyText={
            hiddenCount > 0
              ? `${countLabel(hiddenCount, "person you don't manage is", "people you don't manage are")} on it.`
              : "Nobody is on this project yet."
          }
          add={
            canChangeLinks
              ? {
                  label: "Add people",
                  icon: UserPlus,
                  onClick: () => panel.openView(PEOPLE_PICKER, project.name),
                }
              : undefined
          }
        />

        <PanelList
          title="Activities"
          items={activities}
          getKey={(activity) => activity.id}
          groupBy={(activity) => ({
            key: activity.category.id,
            heading: (
              <EntityLink
                entity={{ type: "category", id: activity.category.id }}
                tone="plain"
                className="inline-flex items-center gap-1.5 text-muted-foreground"
              >
                <FolderTree aria-hidden="true" className="size-3.5" />
                {activity.category.name}
              </EntityLink>
            ),
          })}
          renderRow={(activity) => ({
            entity: { type: "activity", id: activity.id },
            name: activity.name,
            remove: canChangeLinks
              ? {
                  label: `Remove ${activity.name} from ${project.name}`,
                  onClick: () => changes.removeActivity(project, activity),
                }
              : undefined,
          })}
          emptyText="No activities yet, so nobody can log time on it."
          add={
            canChangeLinks
              ? {
                  label: "Add activities",
                  icon: Plus,
                  onClick: () =>
                    panel.openView(ACTIVITIES_PICKER, project.name),
                }
              : undefined
          }
        />

        {archivedActivities.length > 0 && (
          <PanelList
            title="Archived activities"
            note="Restoring an activity brings it back here."
            items={archivedActivities}
            getKey={(activity) => activity.id}
            renderRow={(activity) => ({
              entity: { type: "activity", id: activity.id },
              name: activity.name,
              isInactive: true,
              status: <StatusText>Archived</StatusText>,
            })}
            emptyText="No archived activities."
          />
        )}
      </EntityPanelLayout>

      {projectActions.dialogs}
      {changes.dialogs}
    </>
  );
};

export const ProjectPanel = ({ id }: { id: string }) => {
  const { data: project, isLoading, error, refetch } = useProjectDetails(id);

  if (!project) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  return <ProjectDetails project={project} />;
};
