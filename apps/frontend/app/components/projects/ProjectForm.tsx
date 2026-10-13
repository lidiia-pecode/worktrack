"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Input from "@/components/ui/input";
import { PanelTitleInput } from "../entity-panel/EntityPanelLayout";
import { Button } from "@/components/ui/button";

import { Field, fieldMessageId } from "@/components/ui/field";
import { isConflictError } from "@/lib/api";
import { useReportDirty } from "@/hooks/useReportDirty";

import { OptionCards } from "../shared/inputs/OptionCards";
import { DescriptionEditor } from "./DescriptionEditor";

const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters")
      .max(255, "Project name must be at most 255 characters"),

    workType: z.enum(["client", "internal"]),

    clientName: z
      .string()
      .trim()
      .max(255, "Client name must be at most 255 characters"),

    description: z
      .string()
      .max(1000, "Description must be at most 1000 characters")
      .optional(),
  })
  .refine(
    (values) => values.workType === "internal" || values.clientName !== "",
    { path: ["clientName"], message: "Enter the client this work is for" },
  );

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const WORK_TYPE_OPTIONS: {
  value: ProjectFormValues["workType"];
  label: string;
  description: string;
}[] = [
  {
    value: "client",
    label: "Client work",
    description: "Done for a client, named below.",
  },
  {
    value: "internal",
    label: "Internal",
    description: "Your own company's work, with no client.",
  },
];

/** An internal project is one with no client. */
export type ProjectFormData = {
  name: string;
  clientName: string | null;
  description?: string;
};

interface ProjectFormProps {
  formId: string;
  defaultValues?: Partial<ProjectFormData>;
  clientSuggestions?: string[];
  mode?: "create" | "edit";
  onSubmit: (data: ProjectFormData) => void | Promise<unknown>;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const ProjectForm = ({
  formId,
  defaultValues,
  mode = "create",
  clientSuggestions = [],
  onSubmit,
  isSubmitting = false,
  onDirtyChange,
}: ProjectFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      workType:
        mode === "edit" && !defaultValues?.clientName ? "internal" : "client",
      clientName: defaultValues?.clientName ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  const workType = useWatch({ control, name: "workType" });
  const [showsDescription, setShowsDescription] = useState(
    mode === "edit" || Boolean(defaultValues?.description),
  );

  useReportDirty(isDirty, onDirtyChange);

  // The API refuses a taken name; show it under the field.
  const submit = async ({
    workType,
    clientName,
    ...rest
  }: ProjectFormValues) => {
    try {
      await onSubmit({
        ...rest,
        clientName: workType === "client" ? clientName : null,
      });
    } catch (error) {
      if (isConflictError(error)) {
        setError("name", {
          message: "A project with this name already exists",
        });
      }
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      <PanelTitleInput
        id="project-name"
        aria-label="Project name"
        placeholder="e.g. Website redesign"
        autoFocus
        {...register("name")}
        error={errors.name?.message}
        disabled={isSubmitting}
      />

      <Field id="project-work-type" label="Who is it for" group>
        <Controller
          name="workType"
          control={control}
          render={({ field }) => (
            <OptionCards
              name="project-work-type"
              value={field.value}
              options={WORK_TYPE_OPTIONS}
              onChange={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />

        {workType === "client" && (
          <div className="mt-3">
            <Input
              id="project-client"
              aria-label="Client name"
              {...register("clientName")}
              list="project-client-suggestions"
              autoComplete="off"
              placeholder="Client name, e.g. Retail Corp"
              error={errors.clientName?.message}
              disabled={isSubmitting}
            />

            <datalist id="project-client-suggestions">
              {clientSuggestions.map((client) => (
                <option key={client} value={client} />
              ))}
            </datalist>
          </div>
        )}
      </Field>

      {!showsDescription ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowsDescription(true)}
          disabled={isSubmitting}
          className="-ml-2 gap-1.5 text-brand"
        >
          <Plus className="size-4" />
          Add description
        </Button>
      ) : (
        <Field
          id="project-description"
          label="Description"
          error={errors.description?.message}
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <DescriptionEditor
                id="project-description"
                labelledBy="project-description-label"
                describedBy={fieldMessageId("project-description", {
                  error: errors.description?.message,
                })}
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
        </Field>
      )}
    </form>
  );
};
