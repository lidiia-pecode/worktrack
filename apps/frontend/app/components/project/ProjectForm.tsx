"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReactMarkdown from "react-markdown";
import * as z from "zod";

import { ProjectStatus } from "@/types/enums";
import { StatusBadge } from "../ui/StatusBadge";
import { DescriptionEditor } from "./DescriptionEditor";

const projectSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .nonempty("Name is required"),
  description: z.string().optional(),
  status: z.enum(ProjectStatus),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  defaultValues: ProjectFormData;
  onSubmit: (data: ProjectFormData) => void;
  isEditMode: boolean;
  formId: string;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  defaultValues,
  onSubmit,
  isEditMode,
  formId,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectSchema) as any,
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Project Name */}
      <div>
        {isEditMode ? (
          <div className="flex flex-col gap-1">
            <input
              {...register("name")}
              placeholder="Project name"
              className={`text-2xl font-semibold w-full border-b-2 outline-none pb-1 transition-colors
                ${errors.name ? "border-red-400 placeholder:text-red-300" : "border-zinc-200 focus:border-blue-500"}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>
        ) : (
          <div className="flex gap-4 justify-between">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {defaultValues.name}
            </h1>

            <StatusBadge status={defaultValues.status} size="md" />
          </div>
        )}
      </div>

      {/* Description */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
          Description
        </p>

        {isEditMode ? (
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <DescriptionEditor
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        ) : defaultValues.description ? (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-100 p-4">
            <div className="prose prose-sm max-w-none prose-zinc prose-headings:font-semibold prose-ul:my-1 prose-li:my-0 prose-ol:my-1">
              <ReactMarkdown>{defaultValues.description}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">
            No description provided
          </p>
        )}
      </section>
    </form>
  );
};
