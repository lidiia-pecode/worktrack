"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivitiesClientApi } from "@/app/api/activities/activities.client";
import { UpdateActivityPayload } from "@/types/Activities";
import { useMemo } from "react";

export function useActivities(page: number = 1) {
  const queryClient = useQueryClient();

  const activitiesQuery = useQuery({
    queryKey: ["activities", page],
    queryFn: () => ActivitiesClientApi.getAllPaginated(page),
  });

  const activitiesInfiniteQuery = useInfiniteQuery({
    queryKey: ["activities"],

    queryFn: ({ pageParam = 1 }) =>
      ActivitiesClientApi.getAllPaginated(pageParam),

    initialPageParam: 1,

    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.flatMap((p) => p.results).length;
      return loaded < lastPage.count ? pages.length + 1 : undefined;
    },
  });

  const activities = useMemo(
    () => activitiesInfiniteQuery.data?.pages.flatMap((p) => p.results) ?? [],
    [activitiesInfiniteQuery.data],
  );

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
    activities,

    pagination: {
      fetchNextPage: activitiesInfiniteQuery.fetchNextPage,
      hasNextPage: activitiesInfiniteQuery.hasNextPage,
      isFetchingNextPage: activitiesInfiniteQuery.isFetchingNextPage,
      isLoading: activitiesInfiniteQuery.isLoading,
      isError: activitiesInfiniteQuery.isError,
    },

    actions: {
      createActivity,
      deleteActivity,
      updateActivity,
    },
    query: activitiesQuery,
  };
}
