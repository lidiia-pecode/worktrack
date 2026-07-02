"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectsClientApi } from "@/app/api/projects/projects.client";
import { UpdateProjectPayload } from "@/types";
import { toast } from "sonner";

export function useProjects(page: number = 1) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["projects", page],
    queryFn: () => ProjectsClientApi.getAll(page),
  });

  const createProject = useMutation({
    mutationFn: ProjectsClientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectPayload }) =>
      ProjectsClientApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated successfully");
    },
  });

  const deleteProject = useMutation({
    mutationFn: ProjectsClientApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully");
    },
  });

  return {
    ...query,
    createProject,
    deleteProject,
    updateProject,
  };
}
