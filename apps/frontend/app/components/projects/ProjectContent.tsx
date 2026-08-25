"use client";

import { useMemo, useState } from "react";

import { FolderKanban } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { hasManagerAccess } from "@/lib/utils/user";

import { Project } from "@/types";

import { ResourcePage } from "../shared/resourse/ResourcePage";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";

export function ProjectsContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const {
    items: projects,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useProjectsInfiniteQuery();

  const editingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId),
    [projects, editingProjectId],
  );

  console.log("project", projects[0]);

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
        renderItem={(project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canManage={canManage}
            onView={(item) => setEditingProjectId(item.id)}
          />
        )}
      />

      <ProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ProjectModal
        key={editingProject?.id ?? "create"}
        project={editingProject}
        open={Boolean(editingProject)}
        onClose={() => setEditingProjectId(null)}
      />
    </>
  );
}
