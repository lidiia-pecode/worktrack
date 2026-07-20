"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const actCategorySchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .nonempty("Name is required"),
});

export type ActCategoryFormData = z.infer<typeof actCategorySchema>;

type ActCategoryFormProps = {
  formId: string;
  defaultValues: ActCategoryFormData;
  isEditMode: boolean;
  onSubmit: (data: ActCategoryFormData) => void;
};

export function ActCategoryForm({
  formId,
  defaultValues,
  isEditMode,
  onSubmit,
}: ActCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActCategoryFormData>({
    resolver: zodResolver(actCategorySchema),
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Activity Category Name
        </p>

        {isEditMode ? (
          <>
            <input
              {...register("name")}
              placeholder="Activity Category Name"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </>
        ) : (
          <h1 className="text-2xl font-semibold text-zinc-900">
            {defaultValues.name}
          </h1>
        )}
      </section>
    </form>
  );
}
