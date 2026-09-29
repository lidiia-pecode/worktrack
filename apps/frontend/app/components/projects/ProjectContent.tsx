"use client";

import { useMemo, useState } from "react";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import {
  useProjectDetails,
  useProjectsInfiniteQuery,
} from "@/hooks/useProjects";
import { hasManagerAccess } from "@/lib/utils/user";

import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { ResourcePage } from "../shared/resourse/ResourcePage";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";

export function ProjectsContent() {
  const { isOnboarding, opensCreateForm, projectId } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(
    projectId,
  );
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.ACTIVE);

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const {
    items: projects,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useProjectsInfiniteQuery({
    status,
  });

  const listedProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId),
    [projects, editingProjectId],
  );

  // A project opened from a setup link may not be on the loaded page.
  const { data: fetchedProject } = useProjectDetails(
    listedProject ? undefined : (editingProjectId ?? undefined),
  );
  const editingProject = listedProject ?? fetchedProject;

  const handleTabChange = (tab: "active" | "archived") => {
    setEditingProjectId(null);
    setStatus(
      tab === "archived" ? ProjectStatus.ARCHIVED : ProjectStatus.ACTIVE,
    );
  };

  return (
    <>
      <ResourcePage<Project>
        title="Projects"
        description="Manage projects and organize the work in your workspace."
        items={projects}
        isLoading={isLoading}
        isError={isError || !canManage}
        onRetry={refetch}
        getSearchValue={(project) => project.name}
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
        tab={status === ProjectStatus.ARCHIVED ? "archived" : "active"}
        onTabChange={handleTabChange}
        renderItem={(project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canManage={canManage}
            onView={(item) => setEditingProjectId(item.id)}
          />
        )}
      />

      <ProjectModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <ProjectModal
        isOnboarding={isOnboarding}
        key={editingProject?.id ?? "create"}
        project={editingProject}
        open={Boolean(editingProject)}
        onClose={() => setEditingProjectId(null)}
      />
    </>
  );
}
