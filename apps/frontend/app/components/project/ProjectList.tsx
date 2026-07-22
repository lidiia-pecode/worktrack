"use client";

import { useState } from "react";

import Pagination from "../shared/Pagination";

import Container from "../layout/Container";
import { useProjects } from "@/hooks/useProjects";
import { UserRole } from "../../../types/enums";
import { useMe } from "@/hooks/useMe";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import { EntityList } from "../shared/EntityList";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";

const PAGE_SIZE = 6;

export const ProjectList = () => {
  const [page, setPage] = useState(1);

  const {
    items: projects,
    count,
    isLoading,
    isError,
    refetch,
  } = useProjects(page);

  const me = useMe();
  const currentUserRole = me.data?.role;
  const isAdmin =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.SUPER_ADMIN;

  const totalPages = Math.ceil(count / PAGE_SIZE);

  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Loading projects"
        description="Fetching your projects..."
      />
    );
  }

  if (isError || !isAdmin) {
    return <ErrorState title="Couldn't load projects" onRetry={refetch} />;
  }

  if (!projects.length) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create your first project to start tracking work."
        action={isAdmin && <CreateProjectModal />}
      />
    );
  }

  return (
    <Container className="flex flex-col grow">
      {isAdmin && <CreateProjectModal />}

      <EntityList
        items={projects}
        renderItem={(project) => (
          <ProjectCard key={project.id} project={project} isAdmin={isAdmin} />
        )}
      />

      <div className="mt-8 flex justify-center">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </Container>
  );
};
