"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Users } from "lucide-react";

import { ProjectStatus } from "@/types/enums";
import Input from "@/components/ui/input";

import { FormSection } from "../shared/FormSection";
import { DescriptionEditor } from "./DescriptionEditor";

const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be less than 100 characters"),

  description: z.string().optional(),

  status: z.enum(ProjectStatus),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  formId?: string;
  defaultValues?: Partial<ProjectFormData>;
  mode?: "create" | "edit";
  membersCount?: number;
  activitiesCount?: number;
  onSubmit: (data: ProjectFormData) => void;
  isSubmitting?: boolean;
}

export function ProjectForm({
  formId = "project-form",
  defaultValues,
  mode = "create",
  membersCount = 0,
  activitiesCount = 0,
  onSubmit,
  isSubmitting = false,
}: ProjectFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      status: defaultValues?.status ?? ProjectStatus.ACTIVE,
    },
  });

  const isEditMode = mode === "edit";

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection label="Project name">
        <Input
          id="project-name"
          {...register("name")}
          placeholder="e.g. Website redesign"
          error={errors.name?.message}
          disabled={isSubmitting}
        />

        {!errors.name && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isEditMode
              ? "Update the name used to identify this project."
              : "Choose a clear name that helps people understand what this project is about."}
          </p>
        )}
      </FormSection>

      <FormSection label="Description">
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <DescriptionEditor
              value={field.value ?? ""}
              onChange={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />

        {errors.description?.message && (
          <p className="mt-1.5 text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </FormSection>

      {isEditMode && (
        <FormSection label="Project overview">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <Users className="size-4 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-sm font-medium text-foreground">
                  {membersCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <Activity className="size-4 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">Activities</p>
                <p className="text-sm font-medium text-foreground">
                  {activitiesCount}
                </p>
              </div>
            </div>
          </div>
        </FormSection>
      )}
    </form>
  );
}
