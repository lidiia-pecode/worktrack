"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Input from "@/components/ui/input";
import { PanelTitleInput } from "../entity-panel/EntityPanelLayout";

const activityCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must be at most 100 characters"),
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
  onDirtyChange?: (isDirty: boolean) => void;
}

export const ActivityCategoryForm = ({
  formId = "activity-category-form",
  defaultValues,
  mode = "create",
  onSubmit,
  isSubmitting = false,
  onDirtyChange,
}: ActivityCategoryFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ActivityCategoryFormData>({
    resolver: zodResolver(activityCategoryFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const isEditMode = mode === "edit";

  // In the panel the name stands alone, as the heading does.
  const description =
    errors.name || isEditMode
      ? undefined
      : "Choose a clear name for this activity category.";

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)}>
      {/* In the panel the name takes the heading's place. */}
      {isEditMode ? (
        <PanelTitleInput
          id="activity-category-name"
          aria-label="Category name"
          placeholder="e.g. Development"
          autoFocus
          {...register("name")}
          error={errors.name?.message}
          disabled={isSubmitting}
        />
      ) : (
        <Input
          id="activity-category-name"
          label="Category name"
          placeholder="e.g. Development"
          {...register("name")}
          error={errors.name?.message}
          description={description}
          disabled={isSubmitting}
        />
      )}
    </form>
  );
};
