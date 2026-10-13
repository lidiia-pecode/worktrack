"use client";

import Link from "next/link";

import { createFirstLink } from "@/hooks/useSetupLink";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
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

  categoryId: z.string(),

  defaultBillable: z.boolean(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

/** A draft has no category: it is kept, but cannot go on a project yet. */
export type ActivityFormData = Omit<ActivityFormValues, "categoryId"> & {
  categoryId: string | null;
};

const DRAFT_OPTION = "none";

interface ActivityFormProps {
  formId: string;
  defaultValues?: Partial<ActivityFormData>;
  categories: ActivityCategory[];
  onSubmit: (data: ActivityFormData) => void | Promise<unknown>;
  isSubmitting?: boolean;
  isOnboarding?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  /** Hides the draft option, for an activity that is or will be on a project. */
  requiresCategory?: boolean;
}

export const ActivityForm = ({
  formId,
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
    defaultValues?.categoryId ?? (requiresCategory ? "" : DRAFT_OPTION);

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
    if (!categoryId || (requiresCategory && categoryId === DRAFT_OPTION)) {
      setError("categoryId", { message: "Choose a category" });
      return;
    }

    // The API refuses a taken name; show it under the field.
    try {
      await onSubmit({
        ...values,
        categoryId: categoryId === DRAFT_OPTION ? null : categoryId,
      });
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", {
          message: "An activity with this name already exists",
        });
      }
    }
  };

  useReportDirty(isDirty, onDirtyChange);

  const categoryOptions = [
    ...(requiresCategory
      ? []
      : [{ value: DRAFT_OPTION, label: "No category (draft)" }]),
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const categoriesLink = (label: string) => (
    <Link
      href={createFirstLink("/admin/categories", isOnboarding)}
      className="font-medium text-brand hover:underline"
    >
      {label}
    </Link>
  );

  const categoryHint = requiresCategory ? (
    hasNoCategories && (
      <>
        A project needs categorised activities.{" "}
        {categoriesLink("Create a category first")}.
      </>
    )
  ) : hasNoCategories ? (
    <>
      There is no active category yet, so it starts as a draft.{" "}
      {categoriesLink("Create a category")} to put it on projects.
    </>
  ) : (
    selectedCategory === DRAFT_OPTION &&
    "A draft can't go on a project until it has a category."
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
