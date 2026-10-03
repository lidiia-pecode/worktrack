"use client";

import Link from "next/link";

import { createFirstLink } from "@/hooks/useSetupLink";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ActivityCategory } from "@/types";

import Input from "@/components/ui/input";

import { FormSelect } from "../shared/FormSelect";

const activitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Activity name must be at least 2 characters")
    .max(100, "Activity name must be at most 100 characters"),

  categoryId: z.string().min(1, "Category is required"),

  defaultBillable: z.boolean(),
});

export type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  formId?: string;
  defaultValues?: Partial<ActivityFormData>;
  categories: ActivityCategory[];
  mode?: "create" | "edit";
  onSubmit: (data: ActivityFormData) => void;
  isSubmitting?: boolean;
  isOnboarding?: boolean;
}

export const ActivityForm = ({
  formId = "activity-form",
  defaultValues,
  categories,
  onSubmit,
  isSubmitting = false,
  isOnboarding = false,
}: ActivityFormProps) => {
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
      defaultBillable: defaultValues?.defaultBillable ?? true,
    },
  });

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const hasNoCategories = categories.length === 0;

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        id="activity-name"
        label="Activity name"
        placeholder="e.g. Frontend development"
        {...register("name")}
        error={errors.name?.message}
        disabled={isSubmitting}
      />

      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormSelect
            label="Category"
            value={field.value}
            onValueChange={field.onChange}
            options={categoryOptions}
            placeholder={
              hasNoCategories ? "No active categories" : "Select category"
            }
            description={
              hasNoCategories && (
                <>
                  Every activity belongs to a category.{" "}
                  <Link
                    href={createFirstLink("/admin/categories", isOnboarding)}
                    className="font-medium text-brand hover:underline"
                  >
                    Create a category first
                  </Link>
                  .
                </>
              )
            }
            error={errors.categoryId?.message}
            disabled={isSubmitting || hasNoCategories}
          />
        )}
      />

      <div>
        <label className="flex cursor-pointer select-none items-center gap-2.5">
          <input
            type="checkbox"
            {...register("defaultBillable")}
            disabled={isSubmitting}
            className="size-4 rounded border-input-placeholder/50 accent-brand focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-foreground">Billable by default</span>
        </label>
        <p className="mt-1.5 pl-6.5 text-xs text-muted-foreground">
          New time entries for this activity start as billable. People can still
          change it on each entry.
        </p>
      </div>
    </form>
  );
};
