"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Input from "@/components/ui/input";
import { PanelTitleInput } from "../entity-panel/EntityPanelLayout";

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(255, "Team name must be at most 255 characters"),
});

export type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamFormProps {
  formId?: string;
  defaultValues?: Partial<TeamFormData>;
  mode?: "create" | "edit";
  onSubmit: (data: TeamFormData) => void;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const TeamForm = ({
  formId = "team-form",
  defaultValues,
  mode = "create",
  onSubmit,
  isSubmitting = false,
  onDirtyChange,
}: TeamFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const isEditMode = mode === "edit";

  // In the panel the name stands alone, as the heading does.
  const description =
    errors.name || isEditMode
      ? undefined
      : "Choose a clear name that helps people understand what this team is responsible for.";

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)}>
      {/* In the panel the name takes the heading's place. */}
      {isEditMode ? (
        <PanelTitleInput
          id="team-name"
          aria-label="Team name"
          placeholder="e.g. Engineering"
          autoFocus
          {...register("name")}
          error={errors.name?.message}
          disabled={isSubmitting}
        />
      ) : (
        <Input
          id="team-name"
          label="Team name"
          placeholder="e.g. Engineering"
          {...register("name")}
          error={errors.name?.message}
          description={description}
          disabled={isSubmitting}
        />
      )}
    </form>
  );
};
