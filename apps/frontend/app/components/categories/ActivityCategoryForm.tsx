"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { isConflictError } from "@/lib/api";

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
  onSubmit: (data: ActivityCategoryFormData) => void | Promise<unknown>;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const ActivityCategoryForm = ({
  formId = "activity-category-form",
  defaultValues,
  onSubmit,
  isSubmitting = false,
  onDirtyChange,
}: ActivityCategoryFormProps) => {
  const {
    register,
    handleSubmit,
    setError,
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

  // Names are unique, so a taken one is said where it was typed.
  const submit = async (data: ActivityCategoryFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", {
          message: "A category with this name already exists",
        });
      }
    }
  };

  // The name is set as the heading it becomes, in the panel and on creating.
  return (
    <form id={formId} onSubmit={handleSubmit(submit)}>
      <PanelTitleInput
        id="activity-category-name"
        aria-label="Category name"
        placeholder="e.g. Development"
        autoFocus
        {...register("name")}
        error={errors.name?.message}
        disabled={isSubmitting}
      />
    </form>
  );
};
