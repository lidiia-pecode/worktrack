"use client";

import { useState } from "react";

import Pagination from "../ui/Pagination";

import Container from "../layout/Container";
import { useProjects } from "@/hooks/useProjects";
import { Project } from "../../../types";
import { UserRole } from "../../../types/enums";
import { useMe } from "@/hooks/useMe";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";

const PAGE_SIZE = 6;

export const ProjectList = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useProjects(page);
  const me = useMe();
  const currentUserRole = me.data?.role;
  const isAdmin =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.SUPER_ADMIN;

  const projects: Project[] = data?.results ?? [];
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const projeectsLength = projects.length > 0;

  console.log("proj", projects);
  console.log(me.data);

  if (isLoading) return <p>Loading projects...</p>;
  if (error || !currentUserRole) return <p>Something went wrong</p>;

  return (
    <Container className="flex flex-col grow">
      {isAdmin && <CreateProjectModal />}
      {!projeectsLength ? (
        <p className="text-2xl sm:text-4xl md:text-6xl max-w-fit mx-auto my-24 md:my-32 ">
          There`s no projects yet!
        </p>
      ) : (
        <>
          <div className="grow grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} isAdmin={isAdmin} />
            ))}
          </div>
          <div className="flex justify-center items-center mt-8">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </Container>
  );
};
