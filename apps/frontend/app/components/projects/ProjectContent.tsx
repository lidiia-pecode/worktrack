"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, FolderKanban } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import {
  useProjectDetails,
  useProjectsInfiniteQuery,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { hasManagerAccess } from "@/lib/utils/user";

import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import {
  countLabel,
  ManageColumn,
  ManageList,
  ManageRowAction,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ProjectModal } from "./ProjectModal";

const activitiesCount = (project: Project) =>
  project.projectActivities?.length ?? 0;

const membersCount = (project: Project) => project.membersCount ?? 0;

const isActiveProject = (project: Project) =>
  project.status === ProjectStatus.ACTIVE;

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
  const { isOnboarding, opensCreateForm, projectId } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const [openedProjectId, setOpenedProjectId] = useState<string | null>(
    projectId,
  );
  const listState = useManageListState();
  const status =
    listState.tab === "archived"
      ? ProjectStatus.ARCHIVED
      : ProjectStatus.ACTIVE;

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);
  const { archive, unarchive } = useProjectsMutations();

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

  const listedProject = projects.find(
    (project) => project.id === openedProjectId,
  );

  // A project opened from a setup link may not be on the loaded page.
  const { data: fetchedProject } = useProjectDetails(
    listedProject ? undefined : (openedProjectId ?? undefined),
  );
  const openedProject = listedProject ?? fetchedProject;

  const actionsFor = (project: Project): ManageRowAction[] =>
    isActiveProject(project)
      ? [
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => archive.mutate(project.id),
          },
        ]
      : [
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => unarchive.mutate(project.id),
          },
        ];

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
            onOpen: (project) => setOpenedProjectId(project.id),
            columns: COLUMNS,
            getActions: actionsFor,
          }}
        />
      </ResourcePage>

      <ProjectModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <ProjectModal
        isOnboarding={isOnboarding}
        key={openedProject?.id ?? "create"}
        project={openedProject}
        open={Boolean(openedProject)}
        onClose={() => setOpenedProjectId(null)}
      />
    </>
  );
};
