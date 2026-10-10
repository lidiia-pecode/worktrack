"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useReportDirty } from "@/hooks/useReportDirty";
import { isConflictError } from "@/lib/api";

import { PanelTitleInput } from "../../entity-panel/EntityPanelLayout";

export interface NameFormData {
  name: string;
}

interface NameFormProps {
  formId: string;
  /** What is named, such as "Team", for the label and the messages. */
  entity: string;
  maxLength: number;
  placeholder: string;
  defaultName?: string;
  onSubmit: (data: NameFormData) => void | Promise<unknown>;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

const nameSchema = (entity: string, maxLength: number) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, `${entity} name must be at least 2 characters`)
      .max(maxLength, `${entity} name must be at most ${maxLength} characters`),
  });

/** The form of an entity that has only a name, such as a team or a category. */
export const NameForm = ({
  formId,
  entity,
  maxLength,
  placeholder,
  defaultName = "",
  onSubmit,
  isSubmitting = false,
  onDirtyChange,
}: NameFormProps) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<NameFormData>({
    resolver: zodResolver(nameSchema(entity, maxLength)),
    defaultValues: { name: defaultName },
  });

  useReportDirty(isDirty, onDirtyChange);

  const submit = async (data: NameFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", {
          message: `A ${entity.toLowerCase()} with this name already exists`,
        });
      }
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)}>
      <PanelTitleInput
        id={`${formId}-name`}
        aria-label={`${entity} name`}
        placeholder={placeholder}
        autoFocus
        {...register("name")}
        error={errors.name?.message}
        disabled={isSubmitting}
      />
    </form>
  );
};
