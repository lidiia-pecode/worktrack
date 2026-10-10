"use client";

import { Building2, Plus, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useClientNameSuggestions,
  useProjectDetails,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Project } from "@/types";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelEditForm,
  PanelList,
  PanelQueryState,
  PanelRemoveButton,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
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

// A manager reads only their own people on a project, while the count is the
// project's true size, so the difference is who they cannot see.
const hiddenMembersNote = (hiddenCount: number) =>
  hiddenCount > 0
    ? `${hiddenCount} more ${hiddenCount === 1 ? "person" : "people"} in teams you do not manage.`
    : undefined;

const ProjectEditForm = ({ project }: { project: Project }) => {
  const panel = useEntityPanel();
  const { update } = useProjectsMutations();
  const clientSuggestions = useClientNameSuggestions();

  const save = (data: ProjectFormData) =>
    update.mutate({ id: project.id, data }, { onSuccess: panel.stopEditing });

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
  const changes = useProjectLinkChanges(project);

  const isActive = isActiveProject(project);
  // Archiving it elsewhere, such as from its row, ends the edit.
  const isEditing = panel.isEditing && isActive;
  const canChangeLinks = isActive && !isEditing;

  const members = project.users ?? [];
  const hiddenCount = Math.max((project.membersCount ?? 0) - members.length, 0);
  const activities = offeredActivities(project);

  if (isActive && panel.view === PEOPLE_PICKER) {
    return (
      <>
        <ProjectPeoplePicker project={project} />
      </>
    );
  }

  if (isActive && panel.view === ACTIVITIES_PICKER) {
    return (
      <>
        <ProjectActivitiesPicker project={project} />
      </>
    );
  }

  return (
    <>
      <EntityPanelLayout
        type="Project"
        name={project.name}
        status={<PanelStatus isActive={isActive} />}
        onEdit={
          projectActions.canEdit(project)
            ? () => projectActions.edit(project)
            : undefined
        }
        actions={projectActions.actionsFor(project)}
        meta={
          project.clientName ? (
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-3.5" />
              <span className="text-foreground">{project.clientName}</span>
            </span>
          ) : (
            <span>Internal project</span>
          )
        }
        editForm={isEditing && <ProjectEditForm project={project} />}
        editsName
      >
        {project.description && (
          <p className="-mt-2 text-sm whitespace-pre-line text-foreground/80">
            {project.description}
          </p>
        )}

        <PanelList
          title="People"
          items={members}
          getKey={(member) => member.id}
          note={hiddenMembersNote(hiddenCount)}
          renderRow={(member) => ({
            label: (
              <EntityLink entity={{ type: "user", id: member.id }}>
                {fullName(member)}
              </EntityLink>
            ),
            detail: member.position,
            badge: (
              <div className="flex items-center gap-2">
                {isDeactivatedUser(member) && (
                  <Badge variant="neutral">Deactivated</Badge>
                )}
                {canChangeLinks && (
                  <PanelRemoveButton
                    label={`Remove ${fullName(member)} from ${project.name}`}
                    onClick={() => changes.removeMember(member)}
                  />
                )}
              </div>
            ),
          })}
          emptyText={
            hiddenCount > 0
              ? "Nobody from your teams is on it."
              : "Nobody is on this project yet."
          }
          action={
            canChangeLinks && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => panel.openView(PEOPLE_PICKER, project.name)}
                className="gap-1.5"
              >
                <UserPlus className="size-4" />
                Add people
              </Button>
            )
          }
        />

        <PanelList
          title="Activities"
          items={activities}
          getKey={(activity) => activity.id}
          renderRow={(activity) => ({
            label: (
              <EntityLink entity={{ type: "activity", id: activity.id }}>
                {activity.name}
              </EntityLink>
            ),
            detail: activity.category && (
              <EntityLink
                entity={{ type: "category", id: activity.category.id }}
                tone="plain"
                className="text-muted-foreground"
              >
                {activity.category.name}
              </EntityLink>
            ),
            badge: canChangeLinks && (
              <PanelRemoveButton
                label={`Remove ${activity.name} from ${project.name}`}
                onClick={() => changes.removeActivity(activity)}
              />
            ),
          })}
          emptyText="No activities yet, so nobody can log time on it."
          action={
            canChangeLinks && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => panel.openView(ACTIVITIES_PICKER, project.name)}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add activities
              </Button>
            )
          }
        />
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
