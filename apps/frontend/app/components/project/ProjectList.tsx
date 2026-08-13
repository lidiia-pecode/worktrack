"use client";

import { useState, useMemo } from "react";

import Pagination from "../shared/Pagination";

import Container from "../layout/Container";
import { useProjects } from "@/hooks/useProjects";
import { ProjectStatus } from "../../../types/enums";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import { EntityList } from "../shared/EntityList";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { FilterBar } from "../shared/FilterBar";
import { FolderKanban, FolderClosed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasManagerAccess } from "@/lib/utils/user";

const PAGE_SIZE = 6;

type StatusFilter = "all" | ProjectStatus;

export const ProjectList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    items: projects,
    count,
    isLoading,
    isError,
    refetch,
  } = useProjects(page);

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const archivedCount = useMemo(
    () => projects.filter((p) => p.status === ProjectStatus.ARCHIVED).length,
    [projects],
  );

  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <Container className="flex flex-col grow">
        <LoadingState
          title="Loading projects"
          description="Fetching your projects..."
        />
      </Container>
    );
  }

  if (isError || !canManage) {
    return (
      <Container className="flex flex-col grow">
        <ErrorState title="Couldn't load projects" onRetry={refetch} />
      </Container>
    );
  }

  if (!projects.length) {
    return (
      <Container className="flex flex-col grow">
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking work."
          icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
          action={canManage && <CreateProjectModal />}
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col grow">
      {canManage && <CreateProjectModal />}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        archivedCount={archivedCount}
      />

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title={
              search
                ? "No projects match your search"
                : "No projects in this category"
            }
            description={search ? "Try a different search term." : undefined}
            icon={<FolderClosed className="h-8 w-8 text-muted-foreground" />}
          />
        </div>
      ) : (
        <>
          <EntityList
            items={filtered}
            renderItem={(project) => (
              <ProjectCard
                key={project.id}
                project={project}
                canManage={canManage}
              />
            )}
          />

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </Container>
  );
};
