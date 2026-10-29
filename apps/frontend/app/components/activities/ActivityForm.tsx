"use client";

import Link from "next/link";

import { createFirstLink } from "@/hooks/useSetupLink";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ActivityCategory } from "@/types";

import { Switch } from "@/components/ui/switch";
import { isConflictError } from "@/lib/api";
import { useReportDirty } from "@/hooks/useReportDirty";

import { PanelTitleInput } from "../entity-panel/EntityPanelLayout";

import { FormSelect } from "../shared/FormSelect";

const activitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Activity name must be at least 2 characters")
    .max(100, "Activity name must be at most 100 characters"),

  categoryId: z.string().min(1, "Choose a category"),

  defaultBillable: z.boolean(),
});

export type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  formId: string;
  defaultValues?: Partial<ActivityFormData>;
  categories: ActivityCategory[];
  onSubmit: (data: ActivityFormData) => void | Promise<unknown>;
  isSubmitting?: boolean;
  isOnboarding?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const ActivityForm = ({
  formId,
  defaultValues,
  categories,
  onSubmit,
  isSubmitting = false,
  isOnboarding = false,
  onDirtyChange,
}: ActivityFormProps) => {
  const hasNoCategories = categories.length === 0;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      categoryId: defaultValues?.categoryId ?? "",
      defaultBillable: defaultValues?.defaultBillable ?? true,
    },
  });

  const submit = async (values: ActivityFormData) => {
    // The API refuses a taken name; show it under the field.
    try {
      await onSubmit(values);
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", {
          message: "An activity with this name already exists",
        });
      }
    }
  };

  useReportDirty(isDirty, onDirtyChange);

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  // Every activity is in a category, so one has to exist first.
  const categoryHint = hasNoCategories && (
    <>
      There is no active category yet.{" "}
      <Link
        href={createFirstLink("/admin/categories", isOnboarding)}
        className="font-medium text-brand hover:underline"
      >
        Create a category first
      </Link>
      .
    </>
  );

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      <PanelTitleInput
        id="activity-name"
        aria-label="Activity name"
        placeholder="e.g. Frontend development"
        autoFocus
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
            placeholder="Select category"
            description={categoryHint}
            error={errors.categoryId?.message}
            disabled={isSubmitting || hasNoCategories}
          />
        )}
      />

      <label className="flex cursor-pointer items-center justify-between gap-4 select-none">
        <span>
          <span className="block text-sm font-medium text-foreground">
            Billable by default
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            New time entries on client projects start billable.
          </span>
        </span>

        <Switch {...register("defaultBillable")} disabled={isSubmitting} />
      </label>
    </form>
  );
};
