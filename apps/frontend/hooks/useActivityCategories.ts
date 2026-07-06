import { ActivityCategoriesClientApi } from "@/app/api/activity-categories/activity-categories-client";
import { UpdateActivityCategoryPayload } from "@/types/ActivityCategory";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useActivityCategories(page = 1) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activityCategories", page],
    queryFn: () => ActivityCategoriesClientApi.getAll(page),
  });

  const createCategory = useMutation({
    mutationFn: ActivityCategoriesClientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activityCategories"],
      });

      toast.success("Category created successfully");
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateActivityCategoryPayload;
    }) => ActivityCategoriesClientApi.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activityCategories"],
      });

      toast.success("Category updated successfully");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: ActivityCategoriesClientApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activityCategories"],
      });

      toast.success("Category deleted successfully");
    },
  });

  return {
    ...query,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
