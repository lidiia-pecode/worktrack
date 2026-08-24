"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Input from "@/components/ui/input";

import { ResourceFormField } from "../shared/ResourceFormField";

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(100, "Team name must be less than 100 characters"),
});

export type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamFormProps {
  formId?: string;
  defaultValues?: Partial<TeamFormData>;
  mode?: "create" | "edit";
  onSubmit: (data: TeamFormData) => void;
  isSubmitting?: boolean;
}

export function TeamForm({
  formId = "team-form",
  defaultValues,
  mode = "create",
  onSubmit,
  isSubmitting = false,
}: TeamFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
  });

  const isEditMode = mode === "edit";

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)}>
      <ResourceFormField
        id="team-name"
        label="Team name"
        error={errors.name}
        hint={
          isEditMode
            ? "Update the name used to identify this team."
            : "Choose a clear name that helps people understand what this team is responsible for."
        }
      >
        <Input
          id="team-name"
          type="text"
          placeholder="e.g. Engineering"
          {...register("name")}
          error={errors.name?.message}
          disabled={isSubmitting}
        />
      </ResourceFormField>
    </form>
  );
}
