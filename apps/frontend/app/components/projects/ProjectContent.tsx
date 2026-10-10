"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { hasManagerAccess } from "@/lib/utils/user";

import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
  countLabel,
  ManageColumn,
  ManageList,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ProjectCreateDialog } from "./ProjectCreateDialog";
import { useProjectActions } from "./useProjectActions";

const activitiesCount = (project: Project) =>
  project.projectActivities?.length ?? 0;

const membersCount = (project: Project) => project.membersCount ?? 0;

const COLUMNS: ManageColumn<Project>[] = [
  {
    header: "Client",
    width: "w-56",
    cell: (project) => project.clientName || "Internal",
  },
  {
    header: "People",
    width: "w-24",
    numeric: true,
    cell: membersCount,
    summary: (project) => countLabel(membersCount(project), "person", "people"),
  },
  {
    header: "Activities",
    width: "w-28",
    numeric: true,
    cell: activitiesCount,
    summary: (project) =>
      countLabel(activitiesCount(project), "activity", "activities"),
  },
];

export const ProjectsContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const listState = useManageListState();
  const panel = useEntityPanel();
  const projectActions = useProjectActions();
  const status =
    listState.tab === "archived"
      ? ProjectStatus.ARCHIVED
      : ProjectStatus.ACTIVE;

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const {
    items: projects,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    pagination,
  } = useProjectsInfiniteQuery(
    { status, search: listState.searchQuery },
    { keepPreviousData: true },
  );

  return (
    <>
      <ResourcePage
        title="Projects"
        description="Manage projects and organize the work in your workspace."
        listState={listState}
        itemCount={projects.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canManage}
        onRetry={refetch}
        searchPlaceholder="Search projects..."
        emptyTitle="No projects yet"
        emptyDescription="Create your first project to start tracking work."
        emptyIcon={<FolderKanban className="size-6" />}
        createLabel="Create project"
        onCreate={() => setCreateOpen(true)}
        canCreate={canManage}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
      >
        <ManageList
          label="Projects"
          items={projects}
          row={{
            getKey: (project) => project.id,
            getName: (project) => project.name,
            getEntity: (project) => ({ type: "project", id: project.id }),
            onEdit: projectActions.edit,
            canEdit: projectActions.canEdit,
            columns: COLUMNS,
            getActions: projectActions.actionsFor,
          }}
        />
      </ResourcePage>

      <ProjectCreateDialog
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(project) => panel.open({ type: "project", id: project.id })}
      />

      {projectActions.dialogs}
    </>
  );
};
