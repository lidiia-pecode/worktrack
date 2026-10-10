"use client";

import { useEffect } from "react";
import Link from "next/link";

import { createFirstLink } from "@/hooks/useSetupLink";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ActivityCategory } from "@/types";

import Input from "@/components/ui/input";
import { PanelTitleInput } from "../entity-panel/EntityPanelLayout";

import { FormSelect } from "../shared/FormSelect";

const activitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Activity name must be at least 2 characters")
    .max(100, "Activity name must be at most 100 characters"),

  categoryId: z.string(),

  defaultBillable: z.boolean(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

/** A draft has no category: it is kept, but cannot go on a project yet. */
export type ActivityFormData = Omit<ActivityFormValues, "categoryId"> & {
  categoryId: string | null;
};

const NO_CATEGORY = "none";

interface ActivityFormProps {
  formId?: string;
  defaultValues?: Partial<ActivityFormData>;
  categories: ActivityCategory[];
  mode?: "create" | "edit";
  onSubmit: (data: ActivityFormData) => void;
  isSubmitting?: boolean;
  isOnboarding?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  /** It is on a project, or about to be, so it cannot be left a draft. */
  requiresCategory?: boolean;
}

export const ActivityForm = ({
  formId = "activity-form",
  defaultValues,
  categories,
  mode = "create",
  onSubmit,
  isSubmitting = false,
  isOnboarding = false,
  onDirtyChange,
  requiresCategory = false,
}: ActivityFormProps) => {
  const hasNoCategories = categories.length === 0;
  // A new activity starts as a draft, unless it is for a project.
  const initialCategory =
    defaultValues?.categoryId ?? (requiresCategory ? "" : NO_CATEGORY);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      categoryId: initialCategory,
      defaultBillable: defaultValues?.defaultBillable ?? true,
    },
  });

  const submit = ({ categoryId, ...values }: ActivityFormValues) => {
    if (!categoryId || (requiresCategory && categoryId === NO_CATEGORY)) {
      setError("categoryId", { message: "Choose a category" });
      return;
    }

    onSubmit({
      ...values,
      categoryId: categoryId === NO_CATEGORY ? null : categoryId,
    });
  };

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const categoryOptions = [
    ...(requiresCategory
      ? []
      : [{ value: NO_CATEGORY, label: "No category (draft)" }]),
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const categoryHint = requiresCategory ? (
    hasNoCategories && (
      <>
        A project needs categorised activities.{" "}
        <Link
          href={createFirstLink("/admin/categories", isOnboarding)}
          className="font-medium text-brand hover:underline"
        >
          Create a category first
        </Link>
        .
      </>
    )
  ) : hasNoCategories ? (
    <>
      There is no active category yet, so it starts as a draft.{" "}
      <Link
        href={createFirstLink("/admin/categories", isOnboarding)}
        className="font-medium text-brand hover:underline"
      >
        Create a category
      </Link>{" "}
      to put it on projects.
    </>
  ) : (
    "Without a category it is a draft: it can't be added to a project yet."
  );

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* In the panel the name takes the heading's place. */}
      {mode === "edit" ? (
        <PanelTitleInput
          id="activity-name"
          aria-label="Activity name"
          placeholder="e.g. Frontend development"
          autoFocus
          {...register("name")}
          error={errors.name?.message}
          disabled={isSubmitting}
        />
      ) : (
        <Input
          id="activity-name"
          label="Activity name"
          placeholder="e.g. Frontend development"
          {...register("name")}
          error={errors.name?.message}
          disabled={isSubmitting}
        />
      )}

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
            disabled={isSubmitting || (requiresCategory && hasNoCategories)}
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
