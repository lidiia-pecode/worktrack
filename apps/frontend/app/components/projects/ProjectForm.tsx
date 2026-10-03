"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Users } from "lucide-react";

import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Field,
  fieldLabelClassName,
  fieldMessageId,
} from "@/components/ui/field";
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

/** An internal project is one with no client. */
export type ProjectFormData = {
  name: string;
  clientName: string | null;
  description?: string;
};

interface ProjectFormProps {
  formId?: string;
  defaultValues?: Partial<ProjectFormData>;
  clientSuggestions?: string[];
  mode?: "create" | "edit";
  membersCount?: number;
  activitiesCount?: number;
  onSubmit: (data: ProjectFormData) => void;
  isSubmitting?: boolean;
}

export const ProjectForm = ({
  formId = "project-form",
  defaultValues,
  mode = "create",
  membersCount = 0,
  activitiesCount = 0,
  clientSuggestions = [],
  onSubmit,
  isSubmitting = false,
}: ProjectFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
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
  const isEditMode = mode === "edit";

  const submit = ({ workType, clientName, ...rest }: ProjectFormValues) =>
    onSubmit({
      ...rest,
      clientName: workType === "client" ? clientName : null,
    });

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      <Input
        id="project-name"
        label="Project name"
        {...register("name")}
        placeholder="e.g. Website redesign"
        description={
          isEditMode
            ? "Update the name used to identify this project."
            : "Choose a clear name that helps people understand what this project is about."
        }
        error={errors.name?.message}
        disabled={isSubmitting}
      />

      <Field
        id="project-work-type"
        label="Who is it for"
        group
        description={
          workType === "client"
            ? undefined
            : "Work for your own company, with no client."
        }
      >
        <Controller
          name="workType"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={field.value === "client" ? "primary" : "outline"}
                aria-pressed={field.value === "client"}
                onClick={() => field.onChange("client")}
                disabled={isSubmitting}
              >
                Client work
              </Button>

              <Button
                type="button"
                size="sm"
                variant={field.value === "internal" ? "primary" : "outline"}
                aria-pressed={field.value === "internal"}
                onClick={() => field.onChange("internal")}
                disabled={isSubmitting}
              >
                Internal
              </Button>
            </div>
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
              placeholder="e.g. Retail Corp"
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

      {isEditMode && (
        <section aria-labelledby="project-overview-title">
          <h3 id="project-overview-title" className={fieldLabelClassName}>
            Project overview
          </h3>

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
        </section>
      )}
    </form>
  );
};
