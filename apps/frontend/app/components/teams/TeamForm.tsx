"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { isConflictError } from "@/lib/api";

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
  onSubmit: (data: TeamFormData) => void | Promise<unknown>;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const TeamForm = ({
  formId = "team-form",
  defaultValues,
  onSubmit,
  isSubmitting = false,
  onDirtyChange,
}: TeamFormProps) => {
  const {
    register,
    handleSubmit,
    setError,
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

  // Names are unique, so a taken one is said where it was typed.
  const submit = async (data: TeamFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", { message: "A team with this name already exists" });
      }
    }
  };

  // The name is set as the heading it becomes, in the panel and on creating.
  return (
    <form id={formId} onSubmit={handleSubmit(submit)}>
      <PanelTitleInput
        id="team-name"
        aria-label="Team name"
        placeholder="e.g. Engineering"
        autoFocus
        {...register("name")}
        error={errors.name?.message}
        disabled={isSubmitting}
      />
    </form>
  );
};
