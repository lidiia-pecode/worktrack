"use client";

import { useEffect } from "react";
import Link from "next/link";

import { createFirstLink } from "@/hooks/useSetupLink";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ActivityCategory } from "@/types";

import { Switch } from "@/components/ui/switch";
import { isConflictError } from "@/lib/api";

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
  onSubmit: (data: ActivityFormData) => void | Promise<unknown>;
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

  const selectedCategory = useWatch({ control, name: "categoryId" });

  const submit = async ({ categoryId, ...values }: ActivityFormValues) => {
    if (!categoryId || (requiresCategory && categoryId === NO_CATEGORY)) {
      setError("categoryId", { message: "Choose a category" });
      return;
    }

    // Names are unique, so a taken one is said where it was typed.
    try {
      await onSubmit({
        ...values,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
      });
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", {
          message: "An activity with this name already exists",
        });
      }
    }
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
    selectedCategory === NO_CATEGORY &&
    "A draft can't go on a project until it has a category."
  );

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* The name is set as the heading it becomes, in the panel and on creating. */}
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
            disabled={isSubmitting || (requiresCategory && hasNoCategories)}
          />
        )}
      />

      <label className="flex cursor-pointer items-center justify-between gap-4 select-none">
        <span>
          <span className="block text-sm font-medium text-foreground">
            Billable by default
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            New time entries start billable. People can change each one.
          </span>
        </span>

        <Switch {...register("defaultBillable")} disabled={isSubmitting} />
      </label>
    </form>
  );
};
