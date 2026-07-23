"use client";

import React, { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { ActivityCategory } from "@/types";
import { StatusMenu } from "../shared/StatusMenu";
import { Status } from "@/types/enums";
import { FormSection } from "../shared/FormSection";
import { FormSelect } from "../shared/FormSelect";
import { CategoryBadge } from "../shared/CategoryBadge";

const activitySchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .nonempty("Name is required"),

  categoryId: z.string().min(1, "Category is required"),
  status: z.enum(Status),
});

export type ActivityFormData = z.infer<typeof activitySchema>;

type ActivityFormProps = {
  formId: string;
  defaultValues: ActivityFormData;
  categories: ActivityCategory[];
  isEditMode: boolean;
  onSubmit: (data: ActivityFormData) => void;
  onArchive?: () => void;
  onRestore?: () => void;
  archiveLoading?: boolean;
};

export function ActivityForm({
  formId,
  defaultValues,
  categories,
  isEditMode,
  onSubmit,
  onArchive,
  onRestore,
  archiveLoading,
}: ActivityFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues,
  });

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories],
  );

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FormSection label="Activity Name">
        {isEditMode ? (
          <div className="flex flex-col gap-1">
            <input
              {...register("name")}
              placeholder="Enter activity name"
              className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:border-blue-500 ${
                errors.name ? "border-red-400" : "border-zinc-200"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
        ) : (
          <div className="flex gap-4 justify-between items-start">
            <h1 className="text-2xl font-semibold text-zinc-900 break-words">
              {defaultValues.name}
            </h1>

            <StatusMenu
              status={defaultValues.status}
              loading={archiveLoading}
              onArchive={onArchive}
              onRestore={onRestore}
            />
          </div>
        )}
      </FormSection>

      <FormSection label="Category">
        {isEditMode ? (
          <Controller
            control={control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <FormSelect
                value={field.value}
                onValueChange={field.onChange}
                options={categoryOptions}
                placeholder="Select category"
                error={fieldState.error?.message}
              />
            )}
          />
        ) : (
          <CategoryBadge
            name={
              categories.find(
                (category) => category.id === defaultValues.categoryId,
              )?.name ?? "Unknown category"
            }
          />
        )}
      </FormSection>
    </form>
  );
}
