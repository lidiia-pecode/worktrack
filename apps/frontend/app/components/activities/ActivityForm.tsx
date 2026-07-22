"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { ActivityCategory } from "@/types";
import { StatusMenu } from "../shared/StatusMenu";
import { Status } from "@/types/enums";

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
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section>
        {isEditMode ? (
          <>
            <input
              {...register("name")}
              placeholder="Activity name"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </>
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
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Category
        </p>

        {isEditMode ? (
          <>
            <select
              {...register("categoryId")}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-blue-500"
            >
              <option value="">Select category</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-500">
                {errors.categoryId.message}
              </p>
            )}
          </>
        ) : (
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
            {categories.find(
              (category) => category.id === defaultValues.categoryId,
            )?.name ?? "Unknown category"}
          </div>
        )}
      </section>
    </form>
  );
}
