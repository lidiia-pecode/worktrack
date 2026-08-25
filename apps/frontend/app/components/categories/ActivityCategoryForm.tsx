"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Input from "@/components/ui/input";

const activityCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Category name must be at least 3 characters")
    .max(100, "Category name must be less than 100 characters"),
});

export type ActivityCategoryFormData = z.infer<
  typeof activityCategoryFormSchema
>;

interface ActivityCategoryFormProps {
  formId?: string;
  defaultValues?: Partial<ActivityCategoryFormData>;
  mode?: "create" | "edit";
  onSubmit: (data: ActivityCategoryFormData) => void;
  isSubmitting?: boolean;
}

export function ActivityCategoryForm({
  formId = "activity-category-form",
  defaultValues,
  mode = "create",
  onSubmit,
  isSubmitting = false,
}: ActivityCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityCategoryFormData>({
    resolver: zodResolver(activityCategoryFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
  });

  const isEditMode = mode === "edit";

  const description = errors.name
    ? undefined
    : isEditMode
      ? "Update the name used to identify this activity category."
      : "Choose a clear name for this activity category.";

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)}>
      <Input
        id="activity-category-name"
        label="Category name"
        type="text"
        placeholder="e.g. Development"
        {...register("name")}
        error={errors.name?.message}
        description={description}
        disabled={isSubmitting}
      />
    </form>
  );
}
