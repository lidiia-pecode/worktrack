"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivitiesClientApi } from "@/app/api/activities/activities.client";
import { UpdateActivityPayload } from "@/types/Activities";

export function useActivities(page: number = 1) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activities", page],
    queryFn: () => ActivitiesClientApi.getAll(page),
  });

  const createActivity = useMutation({
    mutationFn: ActivitiesClientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity created successfully");
    },
  });

  const updateActivity = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityPayload }) =>
      ActivitiesClientApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity updated successfully");
    },
  });

  const deleteActivity = useMutation({
    mutationFn: ActivitiesClientApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity deleted successfully");
    },
  });

  return {
    ...query,
    createActivity,
    deleteActivity,
    updateActivity,
  };
}
