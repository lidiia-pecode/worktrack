"use client";

import { useState } from "react";

import { FolderKanban } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { hasManagerAccess } from "@/lib/utils/user";
import { Project } from "@/types";

import { ResourcePage } from "../shared/resourse/ResourcePage";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectModal } from "./CreateProjectModal";

export const ProjectList = () => {
  const [createOpen, setCreateOpen] = useState(false);

  const { items: projects, isLoading, isError, refetch } = useProjects(1);

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

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
        renderItem={(project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canManage={canManage}
          />
        )}
      />

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
};
