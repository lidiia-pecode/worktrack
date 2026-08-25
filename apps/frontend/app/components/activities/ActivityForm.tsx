"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ActivityCategory } from "@/types";

import Input from "@/components/ui/input";

import { FormSection } from "../shared/FormSection";
import { FormSelect } from "../shared/FormSelect";

const activitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Activity name must be at least 3 characters")
    .max(100, "Activity name must be less than 100 characters"),

  categoryId: z.string().min(1, "Category is required"),
});

export type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  formId?: string;
  defaultValues?: Partial<ActivityFormData>;
  categories: ActivityCategory[];
  mode?: "create" | "edit";
  onSubmit: (data: ActivityFormData) => void;
  isSubmitting?: boolean;
}

export function ActivityForm({
  formId = "activity-form",
  defaultValues,
  categories,
  onSubmit,
  isSubmitting = false,
}: ActivityFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      categoryId: defaultValues?.categoryId ?? "",
    },
  });

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection label="Activity name">
        <Input
          id="activity-name"
          placeholder="e.g. Frontend development"
          {...register("name")}
          error={errors.name?.message}
          disabled={isSubmitting}
        />
      </FormSection>

      <FormSection label="Category">
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormSelect
              value={field.value}
              onValueChange={field.onChange}
              options={categoryOptions}
              placeholder="Select category"
              error={errors.categoryId?.message}
              disabled={isSubmitting}
            />
          )}
        />
      </FormSection>
    </form>
  );
}
